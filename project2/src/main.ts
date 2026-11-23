import {DrawingUtils, PoseLandmarker, type Landmark, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
import {BodyLean} from './bodyLean';
import {catLeanAt} from './catLean';
import {LeanDebug} from './leanDebug';
import {OneLegStand} from './oneLegStand';
import {currentScreen, showScreen} from './screens';
import {onBallLost, onGoalReached, onTrapReached, resetBall, setBoardTilt} from './threejsBase.js';

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
const startButton   = document.getElementById('start-button')   as HTMLButtonElement;
const gameHint      = document.getElementById('game-hint')      as HTMLHeadingElement;

let poseLandmarker: PoseLandmarker;
let leanDebug: LeanDebug;
let lastVideoTime = -1;
let introStartMs = 0;

const goalFeedback = document.getElementById('goal-feedback') as HTMLDivElement;
let feedbackTimeout: number | undefined;
const applauseAudio = new Audio('/sounds_interaction2/04_finished.mp3');
const failAudio = new Audio('/sounds_interaction2/03_stop.mp3');

let failedAttempts = 0;
let gameStartTime = 0;
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
    await playCatFromStart();
    showScreen('intro');
}

/**
 * The GIF runs on its own and falls behind when the browser stalls, e.g. when
 * the trap sound plays, so cat and board start over together.
 */
async function playCatFromStart(): Promise<void> {
    // A new URL is the only way to restart a GIF, the board starts once it is loaded
    catImage.src = `img/cat_intro.gif?t=${Date.now()}`;
    await catImage.decode().catch(() => {});
    introStartMs = performance.now();
}

/** The player only has to stand on one leg after pressing start, not during the intro */
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
    // The board stays flat until the player's upright posture is known
    setBoardTilt(bodyLean.update(worldLandmarks, timeMs));
    gameHint.hidden = !bodyLean.isCalibrating;
    leanDebug.update(landmarks, worldLandmarks, bodyLean.isCalibrating);
}

/** The cat shows how to steer until the player presses start */
function updateIntro(timeMs: number): void {
    setBoardTilt(catLeanAt(timeMs - introStartMs));
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

onBallLost(() => {
    if (currentScreen === 'intro') playCatFromStart();
});

onTrapReached(() => {
    if (!roundFinished) {
        failedAttempts++;
        playNegativeSound();
    }
});

onGoalReached(() => {
    if (currentScreen !== 'spiel' || roundFinished) return;
    roundFinished = true;

    const durationSeconds = ((performance.now() - gameStartTime) / 1000).toFixed(1);
    playPositiveSound();

    goalFeedback.hidden = false;
    window.clearTimeout(feedbackTimeout);

    feedbackTimeout = window.setTimeout(() => {
        goalFeedback.hidden = true;

        const ergebnisText = document.getElementById('ergebnis-text');
        if (ergebnisText) {
            ergebnisText.textContent = `Dauer: ${durationSeconds} Sekunden | Fehlversuche: ${failedAttempts}`;
        }

        showScreen('auswertung');
    }, 3000);
});

startButton.addEventListener('click', showStartScreen);

showScreen('laden');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
});
