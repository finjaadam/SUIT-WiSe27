// "Stop" appears after a random time (seconds) spent continuously above the activity threshold
const STOP_DELAY_MIN_SECONDS = 5;
const STOP_DELAY_MAX_SECONDS = 10;
// Below this unsmoothed speed (torso lengths per second) the person counts as standing still
const STILL_THRESHOLD = 0.3;
// The person has to stay still this long to stop the timer, filters out tracking noise
const STILL_HOLD_SECONDS = 0.3;

const STYLES = `
.stop-game {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    color: #fff;
    font-family: sans-serif;
    text-shadow: 0 0 8px #000;
}
.stop-game.is-visible {
    display: flex;
}
.stop-game__title {
    font-size: 25vh;
    font-weight: bold;
    color: #ff2a2a;
    line-height: 1;
}
.stop-game__timer {
    font-size: 8vh;
    font-weight: bold;
    font-variant-numeric: tabular-nums;
}
`;

let stylesInjected = false;

function injectStyles(): void {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
}

type State = 'active' | 'stop' | 'done';

/**
 * Standing still is detected on the unsmoothed speed, so the smoothing of the
 * motion meter does not delay the result. The reaction time ends at the first
 * still frame
 */
export class StopGame {
    private readonly container: HTMLElement;
    private readonly title: HTMLDivElement;
    private readonly timer: HTMLDivElement;
    private readonly threshold: number;
    private readonly onFinished?: (reactionTimeMs: number) => void;
    private readonly stopDelayMs: number;

    private state: State = 'active';
    private activeSinceMs: number | undefined;
    private stopStartMs = 0;
    private stillSinceMs: number | undefined;

    constructor(
        container: HTMLElement,
        options: { threshold: number; onFinished?: (reactionTimeMs: number) => void },
    ) {
        injectStyles();

        this.container   = container;
        this.threshold   = options.threshold;
        this.onFinished  = options.onFinished;
        this.stopDelayMs = (STOP_DELAY_MIN_SECONDS + Math.random() * (STOP_DELAY_MAX_SECONDS - STOP_DELAY_MIN_SECONDS)) * 1000;

        container.classList.add('stop-game');

        this.title = document.createElement('div');
        this.title.className = 'stop-game__title';
        this.title.textContent = 'STOP';

        this.timer = document.createElement('div');
        this.timer.className = 'stop-game__timer';

        container.append(this.title, this.timer);
    }

    update(intensity: number, rawSpeed: number | undefined, timeMs: number): void {
        if (this.state === 'active') this.updateActive(intensity, timeMs);
        else if (this.state === 'stop') this.updateStop(rawSpeed, timeMs);
    }

    private updateActive(intensity: number, timeMs: number): void {
        if (intensity < this.threshold) {
            this.activeSinceMs = undefined;
            return;
        }
        this.activeSinceMs ??= timeMs;
        if (timeMs - this.activeSinceMs < this.stopDelayMs) return;

        this.state       = 'stop';
        this.stopStartMs = timeMs;
        this.showTime(0);
        this.container.classList.add('is-visible');
    }

    private updateStop(rawSpeed: number | undefined, timeMs: number): void {
        if (rawSpeed === undefined || rawSpeed >= STILL_THRESHOLD) {
            this.stillSinceMs = undefined;
            this.showTime(timeMs - this.stopStartMs);
            return;
        }
        this.stillSinceMs ??= timeMs;
        if (timeMs - this.stillSinceMs < STILL_HOLD_SECONDS * 1000) {
            this.showTime(timeMs - this.stopStartMs);
            return;
        }

        this.state = 'done';
        const reactionTimeMs = this.stillSinceMs - this.stopStartMs;
        this.timer.textContent = `Reaktionszeit: ${formatSeconds(reactionTimeMs)}`;
        this.onFinished?.(reactionTimeMs);
    }

    private showTime(ms: number): void {
        this.timer.textContent = formatSeconds(ms);
    }
}

function formatSeconds(ms: number): string {
    return `${(ms / 1000).toFixed(2)} s`;
}
