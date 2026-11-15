import { StopGame } from './stopGame';

export type TutorialCallbacks = {
    // The cat starts moving
    onMove?: () => void;
    // The STOP sign appears or the tutorial is stopped
    onStop?: () => void;
};

export class Tutorial {
    private readonly img: HTMLImageElement;
    private readonly stopContainer: HTMLDivElement;
    private readonly gifSrc: string;
    private readonly stillSrc: string;
    private readonly callbacks: TutorialCallbacks;
    private timeoutId: number | undefined;
    // Counts cycles so a late GIF load from a stopped cycle is ignored
    private cycle = 0;

    constructor(
        imgElement: HTMLImageElement,
        stopElement: HTMLDivElement,
        callbacks: TutorialCallbacks = {},
        gifSrc = 'img/gatze.gif',
        stillSrc = 'img/gatze.png',
    ) {
        this.img = imgElement;
        this.stopContainer = stopElement;
        this.gifSrc = gifSrc;
        this.stillSrc = stillSrc;
        this.callbacks = callbacks;

        new StopGame(this.stopContainer, { threshold: 0 });
    }

    public start(): void {
        this.stop();
        this.runCycle();
    }

    public stop(): void {
        this.cycle++;
        if (this.timeoutId !== undefined) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
        this.stopContainer.classList.remove('is-visible');
        this.callbacks.onStop?.();
    }

    private runCycle(): void {
        const cycle = ++this.cycle;
        // Music and timer start only once the GIF is loaded and the cat is actually moving
        const onGifShown = () => {
            this.img.removeEventListener('load', onGifShown);
            this.img.removeEventListener('error', onGifShown);
            if (cycle !== this.cycle) return; // stopped or restarted meanwhile
            this.stopContainer.classList.remove('is-visible');
            this.callbacks.onMove?.();
            this.scheduleStop();
        };
        this.img.addEventListener('load', onGifShown);
        this.img.addEventListener('error', onGifShown);
        this.img.src = `${this.gifSrc}?t=${Date.now()}`;
    }

    private scheduleStop(): void {
        this.timeoutId = window.setTimeout(() => {
            this.stopContainer.classList.add('is-visible');
            this.img.src = this.stillSrc;
            this.callbacks.onStop?.();

            this.timeoutId = window.setTimeout(() => {
                this.runCycle();
            }, 4000);
        }, 3500);
    }
}