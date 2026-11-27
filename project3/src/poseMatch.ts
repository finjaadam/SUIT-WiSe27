import type {Landmark, NormalizedLandmark} from '@mediapipe/tasks-vision';

/** Direction relative to the player's body, does not have to be normalized */
export type Vec = [number, number, number];

// x points to the player's left, y up along the torso, z to the front
export const UP:      Vec = [0, 1, 0];
export const DOWN:    Vec = [0, -1, 0];
export const LEFT:    Vec = [1, 0, 0];
export const RIGHT:   Vec = [-1, 0, 0];
export const FORWARD: Vec = [0, 0, 1];

/** Combines directions, e.g. sum(UP, LEFT) for diagonally up to the left */
export function sum(...vectors: Vec[]): Vec {
    return vectors.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
}

const LEFT_SHOULDER  = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP       = 23;
const RIGHT_HIP      = 24;
const LEFT_KNEE      = 25;
const RIGHT_KNEE     = 26;

// Start and end landmark of each bone
const BONES = {
    leftUpperArm:  [LEFT_SHOULDER, 13],
    leftForearm:   [13, 15],
    rightUpperArm: [RIGHT_SHOULDER, 14],
    rightForearm:  [14, 16],
    leftThigh:     [LEFT_HIP, LEFT_KNEE],
    leftShin:      [LEFT_KNEE, 27],
    rightThigh:    [RIGHT_HIP, RIGHT_KNEE],
    rightShin:     [RIGHT_KNEE, 28],
} as const;
export type Bone = keyof typeof BONES;

export type Pose = {name: string, image: string, oneLeg?: boolean, bones: Partial<Record<Bone, Vec>>};

const MAX_ANGLE = Math.PI / 2;
const BODY = [...new Set(Object.values(BONES).flat())];

// How much higher the lifted knee has to be for a full score
const FULL_KNEE_LIFT = 0.3;

// Score from which a pose counts as taken
export const MATCH_SCORE = 0.6;

export function isBodyInFrame(landmarks: NormalizedLandmark[] | undefined): boolean {
    return !!landmarks && BODY.every(i => landmarks[i].x >= 0 && landmarks[i].x <= 1 && landmarks[i].y >= 0 && landmarks[i].y <= 1);
}

// How well the player takes the pose, from 0 to 1
export function poseScore(pose: Pose, worldLandmarks: Landmark[] | undefined): number {
    return Math.min(...Object.values(boneScores(pose, worldLandmarks)));
}

type Scores = Partial<Record<Bone | 'oneLeg', number>>;

/** Score of every bone the pose checks and of the lifted knee, for the side that fits better */
function boneScores(pose: Pose, worldLandmarks: Landmark[] | undefined): Scores {
    const asShown  = sideScores(pose, worldLandmarks);
    const mirrored = sideScores(mirror(pose), worldLandmarks);
    return Math.min(...Object.values(mirrored)) > Math.min(...Object.values(asShown)) ? mirrored : asShown;
}

/** Swaps left and right bones and directions */
function mirror(pose: Pose): Pose {
    const bones = Object.fromEntries(Object.entries(pose.bones).map(([bone, [x, y, z]]) => {
        const otherSide = bone.startsWith('left') ? bone.replace('left', 'right') : bone.replace('right', 'left');
        return [otherSide, [-x, y, z]];
    }));
    return {...pose, bones};
}

function sideScores(pose: Pose, worldLandmarks: Landmark[] | undefined): Scores {
    const axes = worldLandmarks && bodyAxes(worldLandmarks);
    const scores: Scores = Object.fromEntries(Object.entries(pose.bones).map(([bone, direction]) => {
        const score = worldLandmarks && axes ? boneScore(worldLandmarks, axes, BONES[bone as Bone], direction) : 0;
        return [bone, score];
    }));
    if (pose.oneLeg) scores.oneLeg = worldLandmarks && axes ? oneLegScore(worldLandmarks, axes) : 0;
    return scores;
}

type Axes = {left: Vec, up: Vec, forward: Vec};

/**
 * Axes of the player's body. Measuring bones against them instead of the
 * camera axes keeps poses recognizable when the player stands a bit turned or
 * leaning, or when the camera image is mirrored.
 */
function bodyAxes(l: Landmark[]): Axes {
    const left = normalize(sum(between(l[RIGHT_SHOULDER], l[LEFT_SHOULDER]), between(l[RIGHT_HIP], l[LEFT_HIP])));
    const torso = sum(between(l[LEFT_HIP], l[LEFT_SHOULDER]), between(l[RIGHT_HIP], l[RIGHT_SHOULDER]));
    const up = normalize(withoutPart(torso, left));
    // Towards the camera: unlike left and right, depth does not change in a mirrored image
    const forward = normalize(withoutPart(withoutPart([0, 0, -1], left), up));
    return {left, up, forward};
}

function boneScore(landmarks: Landmark[], axes: Axes, [from, to]: readonly [number, number], direction: Vec): number {
    const a = landmarks[from];
    const b = landmarks[to];
    const bone = between(a, b);
    const inBody: Vec = [dot(bone, axes.left), dot(bone, axes.up), dot(bone, axes.forward)];
    return Math.max(0, 1 - angleBetween(inBody, direction) / MAX_ANGLE);
}

/**
 * How high one knee is lifted. Only uses the height along the torso, because
 * the depth of a knee lifted forward is estimated too short.
 */
function oneLegScore(l: Landmark[], axes: Axes): number {
    const leftDrop  = -dot(between(l[LEFT_HIP], l[LEFT_KNEE]), axes.up);
    const rightDrop = -dot(between(l[RIGHT_HIP], l[RIGHT_KNEE]), axes.up);
    const standing = Math.max(leftDrop, rightDrop);
    if (standing <= 0) return 0;
    const lift = 1 - Math.min(leftDrop, rightDrop) / standing;
    return Math.min(1, lift / FULL_KNEE_LIFT);
}

function between(a: Landmark, b: Landmark): Vec {
    return [b.x - a.x, b.y - a.y, b.z - a.z];
}

function dot(a: Vec, b: Vec): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v: Vec): Vec {
    const length = Math.hypot(...v);
    return [v[0] / length, v[1] / length, v[2] / length];
}

/** Removes the part of v that points along the normalized axis */
function withoutPart(v: Vec, axis: Vec): Vec {
    const d = dot(v, axis);
    return [v[0] - d * axis[0], v[1] - d * axis[1], v[2] - d * axis[2]];
}

function angleBetween(a: Vec, b: Vec): number {
    const cos = dot(a, b) / (Math.hypot(...a) * Math.hypot(...b));
    return Math.acos(Math.min(1, Math.max(-1, cos)));
}
