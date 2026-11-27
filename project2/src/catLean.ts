import type {Lean} from './threejsBase.js';

// Timeline of public/img/cat_intro.gif (126 frames of 70 ms): every 2.205 s the cat
// leans in another direction, then the GIF starts over
const STEP_MS = 2205;
const DIRECTIONS: Lean[] = [{forward: 1, left: 0}, {forward: -1, left: 0}, {forward: 0, left: 1}, {forward: 0, left: -1}];
const GIF_MS = DIRECTIONS.length * STEP_MS;

/** Lean of the cat at the given time since the GIF started, the board eases into it by itself */
export function catLeanAt(ms: number): Lean {
    const t = ms % STEP_MS;
    // The cat is leaned from about 0.26 s to 1.42 s of each step
    const leaned = t > 260 && t < 1420;
    return leaned ? DIRECTIONS[Math.floor(ms % GIF_MS / STEP_MS)] : {forward: 0, left: 0};
}
