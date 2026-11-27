export interface QuestionAnswerPair {
    id: number;
    question: string;
    answer: string;
}

export const PAIRS: QuestionAnswerPair[] = [
    {
        id: 1,
        question: 'Wie viele Minuten moderate Bewegung pro Woche empfiehlt die WHO Erwachsenen mindestens?',
        answer: '150 Minuten'
    },
    {
        id: 2,
        question: 'Etwa welcher Anteil der Erwachsenen in Deutschland ist innerhalb eines Jahres von einer psychischen Erkrankung betroffen?',
        answer: 'Etwa ein Viertel'
    },
    {
        id: 3,
        question: 'Etwa welcher Anteil der Nacht entfällt bei Erwachsenen auf den Tiefschlaf?',
        answer: 'Rund ein Fünftel (15-20 %)'
    },
    {
        id: 4,
        question: 'Welches „Hungerhormon“ steigt an, wenn wir zu wenig schlafen?',
        answer: 'Ghrelin'
    },
    {
        id: 5,
        question: 'Welches Hormon wird im Fettgewebe gebildet und signalisiert Sättigung?',
        answer: 'Leptin'
    },
    {
        id: 6,
        question: 'Wie viele Stunden Schlaf pro Nacht werden Erwachsenen empfohlen?',
        answer: '7 bis 9 Stunden'
    },
    {
        id: 7,
        question: 'In welcher Schlafphase träumen wir besonders intensiv und verarbeiten Gefühle?',
        answer: 'REM-Schlaf'
    },
    {
        id: 8,
        question: 'In welcher Schlafphase erholt sich der Körper am stärksten?',
        answer: 'Tiefschlaf'
    },
];

export interface Card {
    pairID: number;
    side: 'question' | 'answer';
    text: string;
}

export function createCards(pairs: QuestionAnswerPair[] = PAIRS): Card[] {
    // split cards in question/answer
    const cards: Card[] = pairs.flatMap(pair => [
        {pairID: pair.id, side: 'question', text: pair.question},
        {pairID: pair.id, side: 'answer',   text: pair.answer},
    ]);
    // shuffle cards
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

export function isMatch(a: Card, b: Card): boolean {
    return a.pairID === b.pairID && a.side !== b.side;
}
