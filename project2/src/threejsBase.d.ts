/** Upper body lean from -1 to 1, positive = forward or towards screen-left */
export type Lean = {forward: number, left: number};

/** Tilts the board like the lean: leaning forward lowers the front edge, leaning left the left edge */
export function setBoardTilt(lean: Lean): void;

/** Puts the ball back to its start position above the board, without any motion */
export function resetBall(): void;

export function onGoalReached(callback: () => void): void;

export function onTrapReached(callback: () => void): void;