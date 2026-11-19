import type {NormalizedLandmark} from '@mediapipe/tasks-vision';

const LEFT_SHOULDER  = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP       = 23;
const RIGHT_HIP      = 24;
const LEFT_ANKLE     = 27;
const RIGHT_ANKLE    = 28;
const REQUIRED = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_ANKLE, RIGHT_ANKLE];

const MIN_VISIBILITY = 0.5;
// Smaller torsos (fraction of image height) are measurement errors
const MIN_TORSO = 0.05;
// Height difference between the ankles, in torso lengths, from which one foot counts as lifted
const MIN_LIFT = 0.3;
const HOLD_MS = 3000;
// Short tracking dropouts within this time do not reset the hold
const GRACE_MS = 300;

export type Posture = 'notVisible' | 'twoLegs' | 'oneLeg';

/**
 * Detects a person standing on one leg (either leg): one ankle is clearly
 * higher than the other, relative to the torso length so the distance to the
 * camera does not matter.
 */
export class OneLegStand {
    posture: Posture = 'notVisible';

    private holdStartMs: number | undefined;
    private lastOneLegMs = -Infinity;

    /** Returns how long the pose has been held, from 0 to 1 (= long enough) */
    update(landmarks: NormalizedLandmark[] | undefined, timeMs: number): number {
        this.posture = detectPosture(landmarks);

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

function detectPosture(landmarks: NormalizedLandmark[] | undefined): Posture {
    if (!landmarks || REQUIRED.some(i => landmarks[i].visibility < MIN_VISIBILITY)) return 'notVisible';

    const shoulderY = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2;
    const hipY      = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2;
    const torso     = hipY - shoulderY;
    if (torso < MIN_TORSO) return 'notVisible';

    const lift = Math.abs(landmarks[LEFT_ANKLE].y - landmarks[RIGHT_ANKLE].y) / torso;
    return lift >= MIN_LIFT ? 'oneLeg' : 'twoLegs';
}
