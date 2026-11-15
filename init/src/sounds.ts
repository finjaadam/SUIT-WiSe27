export const SOUNDS = {
    activityMusic: 'sounds/01interaction_activity_music.mp3',
} as const;

// Playback rate of the music
const MIN_RATE = 0.6;
const MAX_RATE = 1.6;
// Browsers handle rates in this range well
const RATE_LIMIT_MIN = 0.5;
const RATE_LIMIT_MAX = 2.0;
// Smaller rate changes are skipped so playbackRate is not rewritten every frame
const RATE_EPSILON = 0.02;

/**
 * Looping background music whose tempo can follow the activity level.
 * The pitch stays the same (preservesPitch is the browser default).
 *
 * Browsers block audio until the user has interacted with the page.
 * If playing fails because of that, it is retried on the first click or key press.
 */
export class Music {
    private readonly audio: HTMLAudioElement;
    private wanted = false;
    private unlockPending = false;

    constructor(src: string = SOUNDS.activityMusic) {
        this.audio = new Audio(src);
        this.audio.loop = true;
        this.audio.preload = 'auto';

        // Only the visible tab plays music, so several open tabs do not overlap
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    play(): void {
        this.wanted = true;
        if (document.hidden) return; // resumes when the tab becomes visible
        this.audio.play().catch((err: DOMException) => {
            // AbortError: play() was interrupted by stop(), nothing to retry
            if (err.name === 'NotAllowedError') this.retryOnInteraction();
        });
    }

    /** Stops the music for good, e.g. when the module is replaced during development */
    dispose(): void {
        this.stop();
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    private readonly onVisibilityChange = (): void => {
        if (document.hidden) this.audio.pause();
        else if (this.wanted) this.play();
    };

    stop(): void {
        this.wanted = false;
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    setRate(rate: number): void {
        const clamped = clamp(rate, RATE_LIMIT_MIN, RATE_LIMIT_MAX);
        if (Math.abs(this.audio.playbackRate - clamped) < RATE_EPSILON) return;
        this.audio.playbackRate = clamped;
    }

    /** Maps an activity value (0..max) to the playback rate */
    setIntensity(intensity: number, max: number): void {
        const ratio = clamp(intensity / max, 0, 1);
        this.setRate(MIN_RATE + ratio * (MAX_RATE - MIN_RATE));
    }

    private retryOnInteraction(): void {
        if (this.unlockPending) return;
        this.unlockPending = true;

        const unlock = () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            this.unlockPending = false;
            if (this.wanted) this.play();
        };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
