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
        const dtSeconds = this.previousTimeMs === undefined ? 0 : (timeMs - this.previousTimeMs) / 1000;
        this.previousTimeMs = timeMs;

        const rawSpeed = dtSeconds > 0 ? this.measureSpeed(landmarks, dtSeconds) : undefined;
        this.previous = landmarks;

        if (dtSeconds <= 0) return this.intensity;

        // Without a measurement (no person), the value slowly decays to 0
        const target = rawSpeed ?? 0;
        const alpha  = 1 - Math.exp(-dtSeconds / SMOOTHING_SECONDS);
        this.intensity += (target - this.intensity) * alpha;

        return this.intensity;
    }

    private measureSpeed(current: NormalizedLandmark[] | undefined, dtSeconds: number): number | undefined {
        const previous = this.previous;
        if (!current || !previous) return undefined;

        const bodyScale = this.bodyScale(current);
        if (!bodyScale) return undefined;

        let distanceSum = 0;
        let count = 0;
        for (let i = FIRST_BODY_LANDMARK; i < current.length; i++) {
            if (!isVisible(current[i]) || !isVisible(previous[i])) continue;
            distanceSum += distance(this.toPoint(current[i]), this.toPoint(previous[i]));
            count++;
        }
        if (count === 0) return undefined;

        return distanceSum / count / bodyScale / dtSeconds;
    }

    private bodyScale(landmarks: NormalizedLandmark[]): number | undefined {
        const ls = landmarks[LEFT_SHOULDER];
        const rs = landmarks[RIGHT_SHOULDER];
        if (!isVisible(ls) || !isVisible(rs)) return undefined;

        const shoulderMid = midpoint(this.toPoint(ls), this.toPoint(rs));
        const lh = landmarks[LEFT_HIP];
        const rh = landmarks[RIGHT_HIP];
        if (isVisible(lh) && isVisible(rh)) {
            return distance(shoulderMid, midpoint(this.toPoint(lh), this.toPoint(rh)));
        }
        return distance(this.toPoint(ls), this.toPoint(rs)) * TORSO_PER_SHOULDER_WIDTH;
    }

    // Scale x to the height so horizontal and vertical distances are comparable
    private toPoint(landmark: NormalizedLandmark): Point {
        return { x: landmark.x * this.aspectRatio, y: landmark.y };
    }
}

function isVisible(landmark: NormalizedLandmark | undefined): landmark is NormalizedLandmark {
    return landmark !== undefined && (landmark.visibility ?? 0) >= MIN_VISIBILITY;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
