import {DrawingUtils, PoseLandmarker, type NormalizedLandmark} from '@mediapipe/tasks-vision';
import {createPoseLandmarker} from '../../shared/poseLandmarker';
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
            bodyHint.hidden = isBodyInFrame(result.landmarks[0]);
            const scores = POSES.map(pose => poseScore(pose, result.worldLandmarks[0]));
            updatePoseScores(scores);
            updateBestPose(scores, timeMs);
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

// One card per pose with a circle that fills up the closer the player gets to the pose
const poseRings = POSES.map((pose, i) => {
    const card = document.createElement('div');
    card.className = 'pose-card';
    // Two cards left and two right of the skeleton, see grid-template-areas
    card.style.gridArea = 'abcd'[i];
    card.innerHTML = `
        <img src="${pose.image}" alt="${pose.name}">
        <svg class="pose-ring" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" pathLength="100"/>
            <circle class="progress" cx="18" cy="18" r="15" pathLength="100"/>
        </svg>`;
    poseCards.append(card);
    return card.querySelector<SVGCircleElement>('.progress')!;
});

startBtn.onclick = () => showScreen('spiel');

showScreen('start');
init().catch(err => {
    console.error(err);
    status.textContent = (err as DOMException).name === 'NotAllowedError'
        ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
        : 'Fehler beim Start. Details in der Konsole.';
    startBtn.textContent = 'Nicht verfügbar';
});
