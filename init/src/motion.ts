import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// Landmarks 0–10 are face points, start counting at the shoulders
const FIRST_BODY_LANDMARK = 11;
const LEFT_SHOULDER  = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP       = 23;
const RIGHT_HIP      = 24;

const MIN_VISIBILITY    = 0.5;
const SMOOTHING_SECONDS = 0.3;
const TORSO_PER_SHOULDER_WIDTH = 1.4;
// Smaller body sizes (fraction of image height) are measurement errors, e.g. shoulders overlapping when turned sideways
const MIN_BODY_SCALE = 0.05;
// Faster points (torso lengths per second) are not human movement, e.g. tracking jumped to another person
const MAX_POINT_SPEED = 15;

type Point = { x: number; y: number };

/**
 * Measures how much a person is moving.
 *
 * Motion intensity = average speed of the visible body landmarks,
 * measured in torso lengths per second. This makes the value independent of
 * how far the person stands from the camera and of the frame rate.
 */
export class MotionMeter {
    intensity = 0;

    private readonly aspectRatio: number;
    private previous: NormalizedLandmark[] | undefined;
    private previousTimeMs: number | undefined;

    constructor(aspectRatio: number) {
        this.aspectRatio = aspectRatio;
    }

    update(landmarks: NormalizedLandmark[] | undefined, timeMs: number): number {
        const previous       = this.previous;
        const previousTimeMs = this.previousTimeMs;
        this.previous       = landmarks;
        this.previousTimeMs = timeMs;

        if (previousTimeMs === undefined || timeMs <= previousTimeMs) return this.intensity;

        const dtSeconds = (timeMs - previousTimeMs) / 1000;
        // Without a measurement (no person), the value slowly decays to 0
        const speed = this.measureSpeed(previous, landmarks, dtSeconds) ?? 0;

        const alpha = 1 - Math.exp(-dtSeconds / SMOOTHING_SECONDS);
        this.intensity += (speed - this.intensity) * alpha;

        return this.intensity;
    }

    private measureSpeed(
        previous: NormalizedLandmark[] | undefined,
        current: NormalizedLandmark[] | undefined,
        dtSeconds: number,
    ): number | undefined {
        if (!previous || !current) return undefined;

        const bodyScale = this.bodyScale(current);
        if (!bodyScale) return undefined;

        let speedSum = 0;
        let count = 0;
        for (let i = FIRST_BODY_LANDMARK; i < current.length; i++) {
            if (!isVisible(current[i]) || !isVisible(previous[i])) continue;
            const speed = this.distance(current[i], previous[i]) / bodyScale / dtSeconds;
            if (speed > MAX_POINT_SPEED) continue;
            speedSum += speed;
            count++;
        }
        if (count === 0) return undefined;

        return speedSum / count;
    }

    private bodyScale(landmarks: NormalizedLandmark[]): number | undefined {
        const ls = landmarks[LEFT_SHOULDER];
        const rs = landmarks[RIGHT_SHOULDER];
        const lh = landmarks[LEFT_HIP];
        const rh = landmarks[RIGHT_HIP];
        if (!isVisible(ls) || !isVisible(rs)) return undefined;

        const scale = isVisible(lh) && isVisible(rh)
            ? this.distance(midpoint(ls, rs), midpoint(lh, rh))
            : this.distance(ls, rs) * TORSO_PER_SHOULDER_WIDTH;
        return scale >= MIN_BODY_SCALE ? scale : undefined;
    }

    // Scale x to the height so horizontal and vertical distances are comparable
    private distance(a: Point, b: Point): number {
        return Math.hypot((a.x - b.x) * this.aspectRatio, a.y - b.y);
    }
}

function isVisible(landmark: NormalizedLandmark): boolean {
    return landmark.visibility >= MIN_VISIBILITY;
}

function midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
