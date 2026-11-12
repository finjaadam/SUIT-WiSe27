import { StopGame } from './stopGame';

export class Tutorial {
    private readonly img: HTMLImageElement;
    private readonly stopContainer: HTMLDivElement;
    private readonly gifSrc: string;
    private readonly stillSrc: string;
    private timeoutId: number | undefined;

    constructor(
        imgElement: HTMLImageElement,
        stopElement: HTMLDivElement,
        gifSrc = 'img/gatze.gif',
        stillSrc = 'img/gatze.png',
    ) {
        this.img = imgElement;
        this.stopContainer = stopElement;
        this.gifSrc = gifSrc;
        this.stillSrc = stillSrc;

        new StopGame(this.stopContainer, { threshold: 0 });
    }

    public start(): void {
        this.stop();
        this.runCycle();
    }

    public stop(): void {
        if (this.timeoutId !== undefined) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
        this.stopContainer.classList.remove('is-visible');
    }

    private runCycle(): void {
        this.img.src = `${this.gifSrc}?t=${Date.now()}`;
        this.stopContainer.classList.remove('is-visible');

        this.timeoutId = window.setTimeout(() => {
            this.stopContainer.classList.add('is-visible');
            this.img.src = this.stillSrc;

            this.timeoutId = window.setTimeout(() => {
                this.runCycle();
            }, 4000);
        }, 3500);
    }
}