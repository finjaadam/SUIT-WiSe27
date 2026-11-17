// Above the threshold: praise. Below: motivate.
const POSITIVE_COMMENTS = [
    'Super, weiter so!',
    'Klasse Bewegung!',
    'Du bist richtig in Fahrt!',
    'Wow, was für eine Energie!',
    'Stark! Bleib dran!',
    'Genau so!',
];

const MOTIVATING_COMMENTS = [
    'Komm, beweg dich!',
    'Da geht noch mehr!',
    'Schwing die Arme!',
    'Ein bisschen schneller!',
    'Du schaffst das!',
    'Los geht’s, zeig was du kannst!',
];

// Same colors as the ends of the activity bar: red when calm, blue when active
const COLOR_POSITIVE   = 'hsl(210, 90%, 55%)';
const COLOR_MOTIVATING = 'hsl(0, 90%, 55%)';

// A new comment while staying on the same side of the threshold
const ROTATE_MS = 4000;
// Shortest time a comment stays visible, so values around the threshold don't make it flicker
const MIN_VISIBLE_MS = 1500;

const STYLES = `
.activity-comment {
    position: absolute;
    left: 50%;
    top: 10vh;
    transform: translateX(-50%);
    z-index: 3;
    font: bold 48px sans-serif;
    text-align: center;
    white-space: nowrap;
    text-shadow: 0 0 6px #000, 0 0 2px #000;
    pointer-events: none;
}
.activity-comment.is-new {
    animation: activity-comment-pop 0.4s ease-out;
}
@keyframes activity-comment-pop {
    from { opacity: 0; transform: translateX(-50%) scale(0.8); }
    to   { opacity: 1; transform: translateX(-50%) scale(1); }
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
 * Shows a random comment depending on the activity: positive ones (blue)
 * above the threshold, motivating ones (red) below it.
 */
export class ActivityComments {
    private readonly container: HTMLElement;
    private readonly threshold: number;
    private isAbove: boolean | undefined;
    private current: string | undefined;
    private shownAtMs = -Infinity;

    constructor(container: HTMLElement, threshold: number) {
        injectStyles();
        this.container = container;
        this.threshold = threshold;
        container.classList.add('activity-comment');
    }

    update(value: number, timeMs: number): void {
        const isAbove   = value >= this.threshold;
        const visibleMs = timeMs - this.shownAtMs;

        const sideChanged = isAbove !== this.isAbove && visibleMs >= MIN_VISIBLE_MS;
        if (!sideChanged && visibleMs < ROTATE_MS) return;

        this.isAbove   = isAbove;
        this.shownAtMs = timeMs;
        this.show(isAbove);
    }

    hide(): void {
        this.container.textContent = '';
        this.isAbove = undefined;
    }

    private show(isAbove: boolean): void {
        const comments = isAbove ? POSITIVE_COMMENTS : MOTIVATING_COMMENTS;
        this.current = pickRandom(comments, this.current);

        this.container.textContent = this.current;
        this.container.style.color = isAbove ? COLOR_POSITIVE : COLOR_MOTIVATING;

        // Restart the pop-in animation
        this.container.classList.remove('is-new');
        void this.container.offsetWidth;
        this.container.classList.add('is-new');
    }
}

// Random entry, but never the same one twice in a row
function pickRandom(items: string[], previous: string | undefined): string {
    const candidates = items.filter(item => item !== previous);
    return candidates[Math.floor(Math.random() * candidates.length)];
}
