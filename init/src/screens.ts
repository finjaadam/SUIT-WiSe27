export type Screen = 'intro' | 'spiel' | 'auswertung';

export let currentScreen: Screen = 'intro';

export function showScreen(next: Screen): void {
    currentScreen = next;
    document.querySelectorAll<HTMLElement>('[data-screen]').forEach(el => {
        el.hidden = el.dataset.screen !== next;
    });
}