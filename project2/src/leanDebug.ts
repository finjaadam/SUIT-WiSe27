import type {Landmark, NormalizedLandmark} from '@mediapipe/tasks-vision';
import {torsoAngles} from './bodyLean';

// TEMPORARY: compares signals for forward/backward lean, remove once one is chosen.
// Shown only with ?debug in the URL.

const NOSE           = 0;
const LEFT_EAR       = 7;
const RIGHT_EAR      = 8;
const LEFT_SHOULDER  = 11;
const RIGHT_SHOULDER = 12;
const MIN_VISIBILITY = 0.5;

type Signals = {
    /** Torso angle towards the camera from world z, degrees */
    forwardZ: number | undefined,
    /** Torso angle sideways, degrees: the signal that already works, for comparison */
    left: number | undefined,
    /** Shoulder width in the image, percent */
    shoulderWidth: number | undefined,
    /** Nose below the ears, in percent of the ear distance */
    headNod: number | undefined,
};
type Key = keyof Signals;

const LABELS: Record<Key, string> = {
    forwardZ:      'Oberkörper vor (z)  °',
    left:          'Oberkörper links    °',
    shoulderWidth: 'Schulterbreite      %',
    headNod:       'Kopf nicken         %',
};
const KEYS = Object.keys(LABELS) as Key[];

/**
 * Shows the candidate signals relative to the upright posture, with their
 * range since then. Positive values should mean forward (or left).
 */
export class LeanDebug {
    readonly enabled = new URLSearchParams(location.search).has('debug');

    private baseline: Signals | undefined;
    private samples: Signals[] = [];
    private min: Partial<Record<Key, number>> = {};
    private max: Partial<Record<Key, number>> = {};

    private element: HTMLElement;
    private aspect: number;

    constructor(element: HTMLElement, aspect: number) {
        this.element = element;
        this.aspect  = aspect;
        element.hidden = !this.enabled;
        element.textContent = 'Debug aktiv: Werte erscheinen nach dem Ausrichten im Spiel';
    }

    update(landmarks: NormalizedLandmark[] | undefined, worldLandmarks: Landmark[] | undefined, calibrating: boolean): void {
        if (!this.enabled) return;
        const signals = measure(landmarks, worldLandmarks, this.aspect);

        if (calibrating) {
            this.samples.push(signals);
            this.baseline = undefined;
            this.element.textContent = 'Ausrichten…';
            return;
        }
        if (!this.baseline) {
            this.baseline = averageSignals(this.samples);
            this.samples = [];
            this.min = {};
            this.max = {};
        }

        const lines = KEYS.map(key => {
            const value = relative(key, signals[key], this.baseline![key]);
            if (value !== undefined) {
                this.min[key] = Math.min(this.min[key] ?? value, value);
                this.max[key] = Math.max(this.max[key] ?? value, value);
            }
            return `${LABELS[key]} ${format(value)}   [${format(this.min[key])} … ${format(this.max[key])}]`;
        });
        this.element.textContent = lines.join('\n');
    }
}

function measure(landmarks: NormalizedLandmark[] | undefined, worldLandmarks: Landmark[] | undefined, aspect: number): Signals {
    const angles = torsoAngles(worldLandmarks);
    return {
        forwardZ:      angles && angles.forward * 180 / Math.PI,
        left:          angles && angles.left * 180 / Math.PI,
        shoulderWidth: landmarks && visible(landmarks, LEFT_SHOULDER, RIGHT_SHOULDER)
            ? distance(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER], aspect) : undefined,
        headNod:       landmarks && visible(landmarks, NOSE, LEFT_EAR, RIGHT_EAR)
            ? (landmarks[NOSE].y - (landmarks[LEFT_EAR].y + landmarks[RIGHT_EAR].y) / 2)
              / distance(landmarks[LEFT_EAR], landmarks[RIGHT_EAR], aspect) * 100
            : undefined,
    };
}

/** Angles as difference, the shoulder width as percent change */
function relative(key: Key, value: number | undefined, base: number | undefined): number | undefined {
    if (value === undefined || base === undefined) return undefined;
    return key === 'shoulderWidth' ? (value / base - 1) * 100 : value - base;
}

function averageSignals(samples: Signals[]): Signals {
    const result = {} as Signals;
    for (const key of KEYS) {
        const values = samples.map(s => s[key]).filter(v => v !== undefined);
        result[key] = values.length ? values.reduce((a, b) => a + b) / values.length : undefined;
    }
    return result;
}

function visible(landmarks: NormalizedLandmark[], ...indices: number[]): boolean {
    return indices.every(i => landmarks[i].visibility >= MIN_VISIBILITY);
}

/** Distance in the image, x scaled so both axes use the same unit */
function distance(a: NormalizedLandmark, b: NormalizedLandmark, aspect: number): number {
    return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

function format(value: number | undefined): string {
    return value === undefined ? '    –' : value.toFixed(1).padStart(5);
}
