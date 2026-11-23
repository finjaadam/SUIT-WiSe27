import {DrawingUtils, PoseLandmarker, type Landmark, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
import {BodyLean} from './bodyLean';
import {catLeanAt, INTRO_MS} from './catLean';
import {LeanDebug} from './leanDebug';
import {OneLegStand} from './oneLegStand';
import {currentScreen, showScreen} from './screens';
import {onGoalReached, onTrapReached, resetBall, setBoardTilt, setPaused} from './threejsBase.js';

const video         = document.getElementById('video')          as HTMLVideoElement;
const canvas        = document.getElementById('canvas')         as HTMLCanvasElement;
const status        = document.getElementById('status')         as HTMLParagraphElement;
const startHint     = document.getElementById('start-hint')     as HTMLParagraphElement;
const startProgress = document.getElementById('start-progress') as HTMLDivElement;
const ctx           = canvas.getContext('2d')!;
const drawingUtils  = new DrawingUtils(ctx);
const oneLegStand   = new OneLegStand();
const bodyLean      = new BodyLean();
const catImage      = document.getElementById('cat')            as HTMLImageElement;
const gameHint      = document.getElementById('game-hint')      as HTMLHeadingElement;
const pauseScreen   = document.getElementById('pause')          as HTMLDivElement;
const pauseProgress = document.getElementById('pause-progress') as HTMLDivElement;

const PAUSE_DELAY_MS = 2000;

let poseLandmarker: PoseLandmarker;
let leanDebug: LeanDebug;
let lastVideoTime = -1;
let introStartMs = 0;
let pauseStartMs: number | undefined;

const goalFeedback = document.getElementById('goal-feedback') as HTMLDivElement;
let feedbackTimeout: number | undefined;
const applauseAudio = new Audio('/sounds_interaction2/04_finished.mp3');
const failAudio = new Audio('/sounds_interaction2/03_stop.mp3');

let failedAttempts = 0;
let gameStartTime = 0;
let pauseCount = 0;
let roundFinished = false;

async function init(): Promise<void> {
    poseLandmarker = await createPoseLandmarker();

    video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: {width: 1280, height: 720, facingMode: 'user'},
    });
    await video.play();
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    leanDebug = new LeanDebug(document.getElementById('lean-debug')!, video.videoWidth / video.videoHeight);

    status.textContent = '';
    renderLoop();
    await startIntro();
}

function renderLoop(): void {
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const timeMs    = performance.now();
        const result    = poseLandmarker.detectForVideo(video, timeMs);
        const landmarks = result.landmarks[0];

        drawSkeleton(landmarks);
        if (currentScreen === 'start') updateStartScreen(landmarks, timeMs);
        if (currentScreen === 'intro') updateIntro(timeMs);
        if (currentScreen === 'spiel') updateGame(landmarks, result.worldLandmarks[0], timeMs);
    }
    requestAnimationFrame(renderLoop);
}

function updateStartScreen(landmarks: NormalizedLandmark[] | undefined, timeMs: number): void {
    const progress = oneLegStand.update(landmarks, timeMs);
    startProgress.style.width = `${progress * 100}%`;
    startHint.textContent =
        oneLegStand.posture === 'notVisible' ? 'Stell dich so hin, dass du von Kopf bis Fuß zu sehen bist.' :
        progress > 0                         ? 'Gut so, halte die Position!' :
                                               '';

    if (progress >= 1) startGame(timeMs);
}

async function startIntro(): Promise<void> {
    // New URL so the GIF starts from its first frame,
    // show the intro once it is loaded so the board stays in sync with the cat
    catImage.src = `img/cat_intro.gif?t=${Date.now()}`;
    await catImage.decode().catch(() => {});
    showScreen('intro');
    introStartMs = performance.now();
}

/** The player only has to stand on one leg after watching the intro, not during it */
function showStartScreen(): void {
    startProgress.style.width = '0';
    showScreen('start');
}

function startGame(timeMs: number): void {
    // The ball rolled around during the intro
    resetBall();
    bodyLean.calibrate(timeMs);
    showScreen('spiel');
    startRoundStats();
}

function updateGame(landmarks: NormalizedLandmark[] | undefined, worldLandmarks: Landmark[] | undefined, timeMs: number): void {
    if (updatePause(landmarks, timeMs)) return;
    // The board stays flat until the player's upright posture is known
    setBoardTilt(bodyLean.update(worldLandmarks, timeMs));
    gameHint.hidden = !bodyLean.isCalibrating;
    leanDebug.update(landmarks, worldLandmarks, bodyLean.isCalibrating);
}

/**
 * Pauses the game once the player stood on both legs for a moment, until they
 * stand on one leg again like on the start screen. Returns whether the game is paused.
 */
function updatePause(landmarks: NormalizedLandmark[] | undefined, timeMs: number): boolean {
    const progress = oneLegStand.update(landmarks, timeMs);

    if (pauseStartMs === undefined) {
        if (roundFinished || oneLegStand.msWithoutOneLeg(timeMs) < PAUSE_DELAY_MS) return false;
        pauseStartMs = timeMs;
        setPaused(true);
        pauseCount++;
        gameHint.hidden = true;
    }

    pauseProgress.style.width = `${progress * 100}%`;
    if (progress >= 1) {
        // The pause does not count towards the round time
        gameStartTime += timeMs - pauseStartMs;
        pauseStartMs = undefined;
        setPaused(false);
    }
    pauseScreen.hidden = pauseStartMs === undefined;
    return pauseStartMs !== undefined;
}

/** The cat shows how to steer, afterwards the player stands on one leg to take over the board */
function updateIntro(timeMs: number): void {
    const introMs = timeMs - introStartMs;
    if (introMs < INTRO_MS) setBoardTilt(catLeanAt(introMs));
    else showStartScreen();
}

function drawSkeleton(landmarks: NormalizedLandmark[] | undefined): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: '#00FF00', 
        lineWidth: 8 
    });
    drawingUtils.drawLandmarks(landmarks, {
        color: '#FF0000', 
        fillColor: '#FF0000', 
        radius: 10 
    });
}

function startRoundStats(): void {
    failedAttempts = 0;
    pauseCount = 0;
    roundFinished = false;
    gameStartTime = performance.now();
}

function playPositiveSound(): void {
    applauseAudio.currentTime = 0;
    applauseAudio.play().catch(() => {});
}

function playNegativeSound(): void {
    failAudio.currentTime = 0;
    failAudio.play().catch((err) => {
        console.error('Fehler beim Abspielen von failAudio:', err);
    });
}

onTrapReached(() => {
    if (!roundFinished) {
        failedAttempts++;
        playNegativeSound();
    }
});

onGoalReached(() => {
    if (roundFinished) return;
    roundFinished = true;

    const durationSeconds = ((performance.now() - gameStartTime) / 1000).toFixed(1);
    playPositiveSound();

    goalFeedback.hidden = false;
    window.clearTimeout(feedbackTimeout);

    feedbackTimeout = window.setTimeout(() => {
        goalFeedback.hidden = true;

        const ergebnisText = document.getElementById('ergebnis-text');
        if (ergebnisText) {
            ergebnisText.textContent = `Dauer: ${durationSeconds} Sekunden | Fehlversuche: ${failedAttempts} | Bein abgestellt: ${pauseCount}`;
        }

        showScreen('auswertung');
    }, 3000);
});

showScreen('laden');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
});
