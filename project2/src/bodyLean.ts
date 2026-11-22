import type {Landmark} from '@mediapipe/tasks-vision';
import type {Lean} from './threejsBase.js';

const LEFT_SHOULDER  = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP       = 23;
const RIGHT_HIP      = 24;
const REQUIRED = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP];

const MIN_VISIBILITY = 0.5;
// Torso angles from the player's upright posture in degrees: below the dead zone the
// board stays flat, at the max angle it is fully tilted. Standing on one leg allows only small leans.
const SIDE: AngleRange    = {deadZoneDeg: 4, maxDeg: 20};
// The depth estimate from a single camera underrates forward/backward leans a lot
// and is noisy, so it needs a wider dead zone and smoothing
const FORWARD: AngleRange = {deadZoneDeg: 3, maxDeg: 9};
// Time constant of the forward smoothing: larger = calmer board, but it reacts later
const FORWARD_SMOOTHING_MS = 250;
// How long the upright posture is measured, it counts only once the torso was seen this often
const CALIBRATION_MS          = 1500;
const MIN_CALIBRATION_SAMPLES = 10;

const NEUTRAL: Lean = {forward: 0, left: 0};

export type TorsoAngles = {forward: number, left: number};
type AngleRange = {deadZoneDeg: number, maxDeg: number};

/**
 * Upper body lean of the player from the pose world landmarks (metric 3D
 * coordinates around the hips, so the distance to the camera does not matter).
 * Measures how far the line from the hip center to the shoulder center tilts
 * towards the camera (= forward) and towards the player's left (screen-left in
 * the mirrored view).
 *
 * Nobody stands at exactly 0°, and the camera height shifts the measured angle,
 * so the lean is relative to the player's own upright posture, measured by calibrate().
 */
export class BodyLean {
    private neutral: TorsoAngles = {forward: 0, left: 0};
    private calibrationStartMs: number | undefined;
    private samples: TorsoAngles[] = [];
    private smoothedForward = 0;
    private lastUpdateMs = 0;

    get isCalibrating(): boolean {
        return this.calibrationStartMs !== undefined;
    }

    /** Measures the upright posture from now on, the player should stand straight meanwhile */
    calibrate(timeMs: number): void {
        this.calibrationStartMs = timeMs;
        this.samples = [];
    }

    /** Lean from -1 to 1, neutral while calibrating or if the torso is not visible */
    update(worldLandmarks: Landmark[] | undefined, timeMs: number): Lean {
        const angles = torsoAngles(worldLandmarks);
        const elapsedMs = timeMs - this.lastUpdateMs;
        this.lastUpdateMs = timeMs;

        if (this.calibrationStartMs !== undefined) {
            if (angles) this.samples.push(angles);
            if (timeMs - this.calibrationStartMs >= CALIBRATION_MS && this.samples.length >= MIN_CALIBRATION_SAMPLES) {
                this.neutral = average(this.samples);
                this.smoothedForward = this.neutral.forward;
                this.calibrationStartMs = undefined;
            }
            return NEUTRAL;
        }

        if (!angles) return NEUTRAL;
        // Exponential smoothing that depends on the time, so the frame rate does not matter
        this.smoothedForward += (angles.forward - this.smoothedForward) * (1 - Math.exp(-elapsedMs / FORWARD_SMOOTHING_MS));
        return {
            forward: leanFromAngle(this.smoothedForward - this.neutral.forward, FORWARD),
            left:    leanFromAngle(angles.left - this.neutral.left, SIDE),
        };
    }
}

/** Torso angles from upright in radians, undefined if the torso is not visible */
export function torsoAngles(worldLandmarks: Landmark[] | undefined): TorsoAngles | undefined {
    if (!worldLandmarks || REQUIRED.some(i => worldLandmarks[i].visibility < MIN_VISIBILITY)) return undefined;

    const shoulder = midpoint(worldLandmarks[LEFT_SHOULDER], worldLandmarks[RIGHT_SHOULDER]);
    const hip      = midpoint(worldLandmarks[LEFT_HIP], worldLandmarks[RIGHT_HIP]);
    // y points down, z towards the camera (found in tests, the board tilted the wrong way
    // with z the other way round), x towards the player's left
    const up      = hip.y - shoulder.y;
    const towards = shoulder.z - hip.z;
    const left    = shoulder.x - hip.x;
    if (up <= 0) return undefined;

    return {forward: Math.atan2(towards, up), left: Math.atan2(left, up)};
}

/** Maps a torso angle in radians to -1..1 */
function leanFromAngle(angle: number, range: AngleRange): number {
    const degrees = Math.abs(angle) * 180 / Math.PI;
    const amount  = (degrees - range.deadZoneDeg) / (range.maxDeg - range.deadZoneDeg);
    return Math.sign(angle) * Math.min(Math.max(amount, 0), 1);
}

function average(samples: TorsoAngles[]): TorsoAngles {
    const sum = samples.reduce((a, b) => ({forward: a.forward + b.forward, left: a.left + b.left}));
    return {forward: sum.forward / samples.length, left: sum.left / samples.length};
}

function midpoint(a: Landmark, b: Landmark): {x: number, y: number, z: number} {
    return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2};
}
