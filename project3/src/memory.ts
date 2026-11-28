import {isMatch, type Card} from './cards';

export type LogInResult = 'match' | 'noMatch' | 'incomplete';

export class MemoryGame {
    readonly cards: Card[];
    open: number[] = [];
    found = new Set<number>();

    constructor(cards: Card[]) {
        this.cards = cards;
    }

    get isDone(): boolean {
        return this.found.size === this.cards.length;
    }

    // Once one side is open, only cards of the other side can be turned
    isSelectable(slot: number): boolean {
        if (this.found.has(slot) || this.open.includes(slot) || this.open.length >= 2) return false;
        return this.open.length === 0 || this.cards[this.open[0]].side !== this.cards[slot].side;
    }

    flip(slot: number): void {
        if (this.isSelectable(slot)) this.open.push(slot);
    }

    logIn(): LogInResult {
        if (this.open.length < 2) return 'incomplete';
        const [a, b] = this.open;
        this.open = [];
        if (!isMatch(this.cards[a], this.cards[b])) return 'noMatch';
        this.found.add(a).add(b);
        return 'match';
    }

    back(): void {
        this.open = [];
    }
}
