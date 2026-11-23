// 'laden' has no section of its own, only the loading status is visible
export type Screen = 'laden' | 'intro' | 'start' | 'spiel' | 'auswertung';

export let currentScreen: Screen = 'laden';

export function showScreen(next: Screen): void {
    currentScreen = next;
    // Lets the CSS adapt elements outside the screens, like the skeleton view
    document.body.dataset.screen = next;
    document.querySelectorAll<HTMLElement>('[data-screen]').forEach(el => {
        el.hidden = el.dataset.screen !== next;
    });
}
