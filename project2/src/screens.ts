export type Screen = 'start' | 'intro';

export let currentScreen: Screen = 'start';

export function showScreen(next: Screen): void {
    currentScreen = next;
    document.querySelectorAll<HTMLElement>('[data-screen]').forEach(el => {
        el.hidden = el.dataset.screen !== next;
    });
}
