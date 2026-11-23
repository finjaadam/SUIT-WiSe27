import {DrawingUtils, PoseLandmarker, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';

const video        = document.getElementById('video')  as HTMLVideoElement;
const canvas       = document.getElementById('canvas') as HTMLCanvasElement;
const status       = document.getElementById('status') as HTMLParagraphElement;
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
    renderLoop();
}

function renderLoop(): void {
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarker.detectForVideo(video, performance.now());
        drawSkeleton(result.landmarks[0]);
    }
    requestAnimationFrame(renderLoop);
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

init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
});
