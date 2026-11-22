import {DrawingUtils, PoseLandmarker, type Landmark, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
import {BodyLean} from './bodyLean';
import {catLeanAt, INTRO_MS} from './catLean';
import {LeanDebug} from './leanDebug';
import {OneLegStand} from './oneLegStand';
import {currentScreen, showScreen} from './screens';
import {onGoalReached, onTrapReached, resetBall, setBoardTilt} from './threejsBase.js';

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

let poseLandmarker: PoseLandmarker;
let leanDebug: LeanDebug;
let lastVideoTime = -1;
// The start screen stays visible while the intro GIF loads, so start it only once
let introStarted = false;
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

    if (progress >= 1 && !introStarted) {
        introStarted = true;
        startIntro();
    }
}

async function startIntro(): Promise<void> {
    // New URL so the GIF starts from its first frame,
    // show the intro once it is loaded so the board stays in sync with the cat
    catImage.src = `img/cat_intro.gif?t=${Date.now()}`;
    await catImage.decode().catch(() => {});
    showScreen('intro');
    introStartMs = performance.now();
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

/** The cat shows how to steer, afterwards the player takes over the board */
function updateIntro(timeMs: number): void {
    const introMs = timeMs - introStartMs;
    if (introMs < INTRO_MS) setBoardTilt(catLeanAt(introMs));
    else startGame(timeMs);
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
    console.log('Spiele Fail-Sound ab...');
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
            ergebnisText.textContent = `Dauer: ${durationSeconds} Sekunden | Fehlversuche: ${failedAttempts}`;
        }

        showScreen('auswertung');
    }, 3000);
});

showScreen('start');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
});
