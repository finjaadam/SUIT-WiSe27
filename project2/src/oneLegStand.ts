import type {NormalizedLandmark} from '@mediapipe/tasks-vision';

const LEFT_SHOULDER  = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP       = 23;
const RIGHT_HIP      = 24;
const LEFT_KNEE      = 25;
const RIGHT_KNEE     = 26;
const LEFT_ANKLE     = 27;
const RIGHT_ANKLE    = 28;
const REQUIRED = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE];

const MIN_VISIBILITY = 0.5;
// Smaller torsos (fraction of image height) are measurement errors
const MIN_TORSO = 0.05;
// Height differences in torso lengths from which a leg counts as lifted:
// the ankle for a foot bent back, the knee for a leg lifted forward
const MIN_ANKLE_LIFT = 0.3;
const MIN_KNEE_LIFT  = 0.2;
// Once on one leg, smaller lifts still count, so values around the threshold do not flicker
const KEEP_FACTOR = 0.7;
const HOLD_MS = 3000;
// Short tracking dropouts within this time do not reset the hold
const GRACE_MS = 500;

export type Posture = 'notVisible' | 'twoLegs' | 'oneLeg';

/**
 * Detects a person standing on one leg (either leg): one knee or one ankle is
 * clearly higher than the other, relative to the torso length so the distance
 * to the camera does not matter.
 */
export class OneLegStand {
    posture: Posture = 'notVisible';

    private holdStartMs: number | undefined;
    private lastOneLegMs = -Infinity;

    /** Returns how long the pose has been held, from 0 to 1 (= long enough) */
    update(landmarks: NormalizedLandmark[] | undefined, timeMs: number): number {
        this.posture = detectPosture(landmarks, this.posture === 'oneLeg' ? KEEP_FACTOR : 1);

        if (this.posture === 'oneLeg') {
            this.holdStartMs ??= timeMs;
            this.lastOneLegMs = timeMs;
        } else if (timeMs - this.lastOneLegMs > GRACE_MS) {
            this.holdStartMs = undefined;
        }

        if (this.holdStartMs === undefined) return 0;
        return Math.min((timeMs - this.holdStartMs) / HOLD_MS, 1);
    }
}

function detectPosture(landmarks: NormalizedLandmark[] | undefined, thresholdFactor: number): Posture {
    if (!landmarks || REQUIRED.some(i => landmarks[i].visibility < MIN_VISIBILITY)) return 'notVisible';

    const shoulderY = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2;
    const hipY      = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;
    const torso     = hipY - shoulderY;
    if (torso < MIN_TORSO) return 'notVisible';

    const kneeLift = heightDifference(landmarks[LEFT_KNEE], landmarks[RIGHT_KNEE]) / torso;
    if (kneeLift >= MIN_KNEE_LIFT * thresholdFactor) return 'oneLeg';

    const ankleLift = heightDifference(landmarks[LEFT_ANKLE], landmarks[RIGHT_ANKLE]) / torso;
    return ankleLift >= MIN_ANKLE_LIFT * thresholdFactor ? 'oneLeg' : 'twoLegs';
}

/** 0 if one of the points is not visible */
function heightDifference(a: NormalizedLandmark, b: NormalizedLandmark): number {
    if (a.visibility < MIN_VISIBILITY || b.visibility < MIN_VISIBILITY) return 0;
    return Math.abs(a.y - b.y);
}
