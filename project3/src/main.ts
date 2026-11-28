import {DrawingUtils, PoseLandmarker, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
import {PAIRS, createCards, type Card} from './cards';
import {MemoryGame} from './memory';
import {MATCH_SCORE, isBodyInFrame, poseScore} from './poseMatch';
import {POSES} from './poses';
import {currentScreen, showScreen} from './screens';

const video        = document.getElementById('video')  as HTMLVideoElement;
const canvas       = document.getElementById('canvas') as HTMLCanvasElement;
const status       = document.getElementById('status') as HTMLParagraphElement;
const startBtn     = document.getElementById('start')  as HTMLButtonElement;
const bodyHint     = document.getElementById('body-hint')  as HTMLHeadingElement;
const poseCards    = document.getElementById('pose-cards') as HTMLDivElement;
const bestPose     = document.getElementById('best-pose')  as HTMLImageElement;
const foundPairs   = document.getElementById('found-pairs') as HTMLDivElement;
const memoryDone   = document.getElementById('memory-done') as HTMLHeadingElement;
const ctx          = canvas.getContext('2d')!;
const drawingUtils = new DrawingUtils(ctx);

let poseLandmarker: PoseLandmarker;
let lastVideoTime = -1;

// Another pose only replaces the shown one after fitting best for this long
const SWITCH_DELAY_MS = 500;
const MIN_BEST_SCORE = 0.2;
let shownPose = -1;
let candidatePose = -1;
let candidateSinceMs = 0;

// How long a pose has to be held to turn its card
const HOLD_MS = 1000;
// The tracking jitters, so short drops below the match score do not end the hold
const DROP_TOLERANCE_MS = 400;
// Share of a new score that goes into the smoothed one, lower is calmer but reacts later
const SMOOTHING = 0.3;
const holdSinceMs: (number | undefined)[] = POSES.map(() => undefined);
const lastMatchMs: number[] = POSES.map(() => 0);
const smoothScores: number[] = POSES.map(() => 0);

// Every pose turns one card, so there are only as many pairs as half the poses
// TODO: Weitere Posen in poses.ts ergänzen, dann kommen mehr Paare ins Spiel
const game = new MemoryGame(questionsLeft(createCards(PAIRS.slice(0, POSES.length / 2))));

/**
 * Puts the questions on the left and the answers on the right of the skeleton,
 * each side still shuffled. Slots alternate left and right, see grid-template-areas.
 */
function questionsLeft(cards: Card[]): Card[] {
    const questions = cards.filter(card => card.side === 'question');
    const answers   = cards.filter(card => card.side === 'answer');
    return questions.flatMap((question, i) => [question, answers[i]]);
}

async function init(): Promise<void> {
    poseLandmarker = await createPoseLandmarker();

    video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: {width: 1280, height: 720, facingMode: 'user'},
    });
    await video.play();
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    status.textContent = '';
    startBtn.disabled = false;
    startBtn.textContent = 'Starten';
    renderLoop();
}

function renderLoop(): void {
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const timeMs = performance.now();
        const result = poseLandmarker.detectForVideo(video, timeMs);
        drawSkeleton(result.landmarks[0]);
        if (currentScreen === 'spiel') {
            bodyHint.hidden = game.isDone || isBodyInFrame(result.landmarks[0]);
            // Cards that cannot be turned right now ignore the player
            const scores = POSES.map((pose, i) => game.isSelectable(i) ? smoothScore(i, poseScore(pose, result.worldLandmarks[0])) : 0);
            updatePoseScores(scores);
            updateBestPose(scores, timeMs);
            updateHold(scores, timeMs);
        }
    }
    requestAnimationFrame(renderLoop);
}

/** Fills the circle on every card as far as the player matches its pose */
function updatePoseScores(scores: number[]): void {
    scores.forEach((score, i) => {
        // A full circle means the pose counts
        const fill = Math.min(1, score / MATCH_SCORE);
        poseRings[i].style.strokeDashoffset = `${100 - fill * 100}`;
        // Orange up to half full, then it turns green
        const hue = 30 + 90 * Math.max(0, fill * 2 - 1);
        poseRings[i].style.stroke = `hsl(${hue}, 80%, 45%)`;
    });
}

/** Lays the pose that fits the player best over the skeleton */
function updateBestPose(scores: number[], timeMs: number): void {
    const best = scores.indexOf(Math.max(...scores));
    const next = scores[best] > MIN_BEST_SCORE ? best : -1;
    if (next !== candidatePose) {
        candidatePose = next;
        candidateSinceMs = timeMs;
    }
    if (candidatePose === shownPose || timeMs - candidateSinceMs < SWITCH_DELAY_MS) return;

    shownPose = candidatePose;
    bestPose.hidden = shownPose < 0;
    if (shownPose >= 0) {
        bestPose.src = POSES[shownPose].image;
        bestPose.alt = POSES[shownPose].name;
    }
}

/** Evens out the jitter of the tracking over the last frames */
function smoothScore(slot: number, score: number): number {
    smoothScores[slot] += (score - smoothScores[slot]) * SMOOTHING;
    return smoothScores[slot];
}

/** Turns a card once its pose is held long enough, ignoring short drops */
function updateHold(scores: number[], timeMs: number): void {
    scores.forEach((score, slot) => {
        if (!game.isSelectable(slot)) {
            holdSinceMs[slot] = undefined;
            smoothScores[slot] = 0;
            return;
        }
        if (score >= MATCH_SCORE) {
            lastMatchMs[slot] = timeMs;
            holdSinceMs[slot] ??= timeMs;
        } else if (timeMs - lastMatchMs[slot] > DROP_TOLERANCE_MS) {
            holdSinceMs[slot] = undefined;
        }
        if (holdSinceMs[slot] === undefined || timeMs - holdSinceMs[slot] < HOLD_MS) return;
        game.flip(slot);
        holdSinceMs.fill(undefined);
        render();
    });
}

function drawSkeleton(landmarks: NormalizedLandmark[] | undefined): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 8,
    });
    drawingUtils.drawLandmarks(landmarks, {
        color: '#FF0000',
        fillColor: '#FF0000',
        radius: 10,
    });
}

/** Shows which cards are open, greyed out or already found */
function render(): void {
    cardEls.forEach((card, slot) => {
        const open  = game.open.includes(slot);
        const found = game.found.has(slot);
        card.classList.toggle('flipped', open);
        card.classList.toggle('found', found);
        card.classList.toggle('disabled', !open && !found && !game.isSelectable(slot));
    });
    memoryDone.hidden = !game.isDone;
}

function logIn(): void {
    const open = [...game.open];
    const result = game.logIn();
    if (result === 'incomplete') return;
    if (result === 'noMatch') return render();

    // The two cards slide from the table to the edge
    open.forEach(slot => cardEls[slot].style.viewTransitionName = `card-${slot}`);
    withTransition(() => {
        open.forEach(slot => cardEls[slot].style.viewTransitionName = '');
        addFoundPair(open);
        render();
    });
}

function back(): void {
    game.back();
    render();
}

/** Lists a found pair at the edge, question first */
function addFoundPair(slots: number[]): void {
    const questionFirst = game.cards[slots[0]].side === 'question' ? slots : [...slots].reverse();
    const entry = document.createElement('div');
    entry.className = 'found-pair';
    for (const slot of questionFirst) {
        const text = document.createElement('p');
        text.textContent = game.cards[slot].text;
        text.style.viewTransitionName = `card-${slot}`;
        entry.append(text);
    }
    foundPairs.append(entry);
}

function withTransition(update: () => void): void {
    if (document.startViewTransition) document.startViewTransition(update);
    else update();
}

// One card per pose with a circle that fills up the closer the player gets to the pose,
// on the back its question or answer
const cardEls = POSES.map((pose, i) => {
    const {side, text} = game.cards[i];
    const card = document.createElement('div');
    card.className = 'pose-card';
    // Two cards left and two right of the skeleton, see grid-template-areas
    card.style.gridArea = 'abcd'[i];
    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <img src="${pose.image}" alt="${pose.name}">
                <svg class="pose-ring" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" pathLength="100"/>
                    <circle class="progress" cx="18" cy="18" r="15" pathLength="100"/>
                </svg>
            </div>
            <div class="card-back">
                <span class="card-label">${side === 'question' ? 'Frage' : 'Antwort'}</span>
                <p></p>
            </div>
        </div>`;
    card.querySelector('.card-back p')!.textContent = text;
    poseCards.append(card);
    return card;
});
const poseRings = cardEls.map(card => card.querySelector<SVGCircleElement>('.progress')!);

// TODO: Durch Spracherkennung „einloggen“ / „zurück“ ersetzen
document.addEventListener('keydown', event => {
    if (currentScreen !== 'spiel' || event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'e') logIn();
    if (key === 'z') back();
});

startBtn.onclick = () => showScreen('spiel');

render();
showScreen('start');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
    startBtn.textContent = 'Nicht verfügbar';
});
