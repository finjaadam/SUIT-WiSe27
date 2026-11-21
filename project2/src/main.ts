import {DrawingUtils, PoseLandmarker, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
import {catLeanAt} from './catLean';
import {OneLegStand} from './oneLegStand';
import {currentScreen, showScreen} from './screens';
import {setBoardTilt} from './threejsBase.js';

const video         = document.getElementById('video')          as HTMLVideoElement;
const canvas        = document.getElementById('canvas')         as HTMLCanvasElement;
const status        = document.getElementById('status')         as HTMLParagraphElement;
const startHint     = document.getElementById('start-hint')     as HTMLParagraphElement;
const startProgress = document.getElementById('start-progress') as HTMLDivElement;
const ctx           = canvas.getContext('2d')!;
const drawingUtils  = new DrawingUtils(ctx);
const oneLegStand   = new OneLegStand();
const catImage      = document.getElementById('cat')            as HTMLImageElement;

let poseLandmarker: PoseLandmarker;
let lastVideoTime = -1;
// The start screen stays visible while the intro GIF loads, so start it only once
let introStarted = false;
let introStartMs = 0;

async function init(): Promise<void> {
    poseLandmarker = await createPoseLandmarker();

    video.srcObject = await navigator.mediaDevices.getUserMedia({
        video: {width: 1280, height: 720, facingMode: 'user'},
    });
    await video.play();
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    status.textContent = '';
    renderLoop();
}

function renderLoop(): void {
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const timeMs    = performance.now();
        const landmarks = poseLandmarker.detectForVideo(video, timeMs).landmarks[0];

        drawSkeleton(landmarks);
        if (currentScreen === 'start') updateStartScreen(landmarks, timeMs);
        // Later the game passes the player's upper body lean here instead
        if (currentScreen === 'intro') setBoardTilt(catLeanAt(timeMs - introStartMs));
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

showScreen('start');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
});
