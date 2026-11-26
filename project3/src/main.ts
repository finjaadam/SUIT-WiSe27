import {DrawingUtils, PoseLandmarker, type Landmark, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
import {MATCH_SCORE, isBodyInFrame, poseScore} from './poseMatch';
import {POSES} from './poses';
import {currentScreen, showScreen} from './screens';

const video        = document.getElementById('video')  as HTMLVideoElement;
const canvas       = document.getElementById('canvas') as HTMLCanvasElement;
const status       = document.getElementById('status') as HTMLParagraphElement;
const startBtn     = document.getElementById('start')  as HTMLButtonElement;
const poseDebug    = document.getElementById('pose-debug') as HTMLPreElement;
const bodyHint     = document.getElementById('body-hint')  as HTMLHeadingElement;
const poseCards    = document.getElementById('pose-cards') as HTMLDivElement;
const ctx          = canvas.getContext('2d')!;
const drawingUtils = new DrawingUtils(ctx);

let poseLandmarker: PoseLandmarker;
let lastVideoTime = -1;

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
        const result = poseLandmarker.detectForVideo(video, performance.now());
        drawSkeleton(result.landmarks[0]);
        if (currentScreen === 'spiel') {
            bodyHint.hidden = isBodyInFrame(result.landmarks[0]);
            showPoseScores(result.worldLandmarks[0]);
        }
    }
    requestAnimationFrame(renderLoop);
}

/** Temporary view to tune the pose detection */
function showPoseScores(worldLandmarks: Landmark[] | undefined): void {
    poseDebug.textContent = POSES.map(pose => {
        const score = poseScore(pose, worldLandmarks);
        return `${score >= MATCH_SCORE ? '✓' : ' '} ${Math.round(score * 100)} %  ${pose.name}`;
    }).join('\n');
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

poseCards.append(...POSES.map(pose => Object.assign(new Image(), {src: pose.image, alt: pose.name})));

startBtn.onclick = () => showScreen('spiel');

showScreen('start');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
    startBtn.textContent = 'Nicht verfügbar';
});
