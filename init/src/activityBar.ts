// Values in torso lengths per second (see MotionMeter)
const DEFAULT_MAX       = 5.0;
const DEFAULT_THRESHOLD = 2.0;

// Hue of the fill color: red when calm, blue when very active
const HUE_EMPTY = 0;
const HUE_FULL  = 210;

const STYLES = `
.activity-bar {
    position: absolute;
    top: 20vh;
    right: 32px;
    width: 40px;
    height: 60vh;
    z-index: 3;
    box-sizing: border-box;
    border: 3px solid #fff;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.4);
    overflow: hidden;
    transition: outline-color 0.2s, box-shadow 0.2s;
    outline: 0 solid transparent;
}
.activity-bar__fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 0;
    transition: height 0.15s linear, background-color 0.15s linear;
}
.activity-bar__threshold {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 2px dashed #fff;
}
.activity-bar.is-reached {
    border-color: gold;
    outline: 6px solid gold;
    animation: activity-bar-pulse 0.6s ease-in-out infinite alternate;
}
@keyframes activity-bar-pulse {
    from { box-shadow: 0 0 12px 4px gold; }
    to   { box-shadow: 0 0 32px 12px gold; }
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

/**
 * Vertical bar that shows a value: it rises and falls with the value,
 * changes its color with the fill level and lights up once the threshold is reached.
 */
export class ActivityBar {
    private readonly container: HTMLElement;
    private readonly fill: HTMLDivElement;
    private readonly max: number;
    private readonly threshold: number;

    constructor(container: HTMLElement, options: { max?: number; threshold?: number } = {}) {
        injectStyles();

        this.container = container;
        this.max       = options.max       ?? DEFAULT_MAX;
        this.threshold = options.threshold ?? DEFAULT_THRESHOLD;

        container.classList.add('activity-bar');

        this.fill = document.createElement('div');
        this.fill.className = 'activity-bar__fill';

        const thresholdLine = document.createElement('div');
        thresholdLine.className = 'activity-bar__threshold';
        thresholdLine.style.bottom = `${clamp(this.threshold / this.max, 0, 1) * 100}%`;

        container.append(this.fill, thresholdLine);
        this.update(0);
    }

    update(value: number): void {
        const ratio = clamp(value / this.max, 0, 1);
        const hue   = HUE_EMPTY + (HUE_FULL - HUE_EMPTY) * ratio;

        this.fill.style.height          = `${ratio * 100}%`;
        this.fill.style.backgroundColor = `hsl(${hue}, 90%, 50%)`;
        this.container.classList.toggle('is-reached', value >= this.threshold);
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
