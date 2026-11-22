import type {Lean} from './threejsBase.js';

// Timeline of public/img/cat_intro.gif: every 2.1 s the cat leans in another direction
const STEP_MS = 2100;
const DIRECTIONS: Lean[] = [{forward: 1, left: 0}, {forward: -1, left: 0}, {forward: 0, left: 1}, {forward: 0, left: -1}];

/** Once the cat has leaned in every direction the intro is over */
export const INTRO_MS = DIRECTIONS.length * STEP_MS;

/** Lean of the cat at the given time since the GIF started, the board eases into it by itself */
export function catLeanAt(ms: number): Lean {
    const t = ms % STEP_MS;
    // The cat is leaned from about 0.25 s to 1.35 s of each step
    const leaned = t > 250 && t < 1350;
    return (leaned && DIRECTIONS[Math.floor(ms / STEP_MS)]) || {forward: 0, left: 0};
}
