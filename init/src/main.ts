import {DrawingUtils, FilesetResolver, PoseLandmarker, type PoseLandmarkerResult} from '@mediapipe/tasks-vision';
import {MotionMeter} from './motion';
import {ActivityBar} from './activityBar';
import {ActivityComments} from './activityComments';
import {StopGame} from './stopGame';
import {showScreen, currentScreen} from './screens';

const video       = document.getElementById('video')        as HTMLVideoElement;
const canvas      = document.getElementById('canvas')       as HTMLCanvasElement;
const ctx         = canvas.getContext('2d')                 as CanvasRenderingContext2D;
const motionValue = document.getElementById('motion-value') as HTMLDivElement;
const startBtn    = document.getElementById('start')        as HTMLButtonElement;
const introMsg    = document.getElementById('intro-msg')    as HTMLParagraphElement;
const activityBar = new ActivityBar(document.getElementById('activity-bar') as HTMLDivElement);
const activityComments = new ActivityComments(
    document.getElementById('activity-comment') as HTMLDivElement,
    activityBar.threshold,
);

const stopGame    = new StopGame(document.getElementById('stop-game') as HTMLDivElement, {
    threshold: activityBar.threshold,
    // Hook for the evaluation screen
    onFinished: reactionTimeMs => {
        reactionResult = reactionTimeMs;
        endGame();
        showScreen('auswertung');
        showResult();
    },

});

let drawingUtils: DrawingUtils | undefined;
let poseLandmarker: PoseLandmarker;
let motionMeter: MotionMeter;
let reactionResult: number | null = null
let modelReady = false;
let stream: MediaStream | null = null;

//läd Modell im Hintergrund
(async () => {
    try {
        const vision = await FilesetResolver.forVisionTasks("public/wasm");

        poseLandmarker = await PoseLandmarker.createFromOptions(
            vision,
            {
            baseOptions: {
                modelAssetPath: "public/models/pose_landmarker_full.task"
            },
            runningMode: "VIDEO"
        });
        modelReady = true;
        if (currentScreen === 'intro') showIntro();
    } catch (err) {
        console.error(err);
        introMsg.textContent = 'Modell konnte nicht geladen werden. Bitte Seite neu laden.';
    }
})();

let lastVideoTime = -1;

async function startGame() {
    video.srcObject = stream;
    await video.play();
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    motionMeter = new MotionMeter(video.videoWidth / video.videoHeight);
    renderLoop();
}

function endGame() {
    stream = null;
    video.srcObject = null;
}

function renderLoop(): void {
    if (currentScreen  !== 'spiel') return;

    if (video.currentTime !== lastVideoTime) {
        const startTimeMs = performance.now();
        const poseLandmarkerResult = poseLandmarker.detectForVideo(video, startTimeMs);
        
        displayVideoResult(poseLandmarkerResult);

        const intensity = motionMeter.update(poseLandmarkerResult.landmarks[0], startTimeMs);
        motionValue.textContent = intensity.toFixed(2);
        activityBar.update(intensity);
        activityComments.update(intensity, startTimeMs);
        stopGame.update(intensity, motionMeter.rawSpeed, startTimeMs);

        lastVideoTime = video.currentTime;
    }
    requestAnimationFrame(() => {
        renderLoop();
    });
}

function displayVideoResult(result: PoseLandmarkerResult) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result.landmarks) {
      if (!drawingUtils) {
          drawingUtils = new DrawingUtils(ctx);
      }

      for (const landmark of result.landmarks) {
        drawingUtils.drawConnectors(
                landmark, 
                PoseLandmarker.POSE_CONNECTIONS, 
                { 
                    color: '#00FF00', 
                    lineWidth: 4     
                }
            );

        drawingUtils.drawLandmarks(
                landmark, 
                { 
                    color: '#FF0000', 
                    fillColor: '#FF0000',
                    radius: 6             
                }
            );
      }
    }
    
    ctx.restore();
}

function showIntro() {
    startBtn.disabled = !modelReady;
    startBtn.textContent = modelReady ? 'Starten' : 'Modell wird geladen…';
}

startBtn.onclick = async () => {
    startBtn.disabled = true;
    introMsg.textContent = '';
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {width: 1280, height: 720, facingMode: 'user'},
        });
        showScreen('spiel'); 
        startGame();
    } catch (err) {
        introMsg.textContent = (err as DOMException).name === 'NotAllowedError'
            ? 'Kamerazugriff wurde verweigert. Bitte im Browser erlauben.'
            : 'Keine Kamera verfügbar.';
        startBtn.disabled = false;
    }
};

function showResult() {
    const zeit = document.getElementById('ergebnis-zeit')!;
    const text = document.getElementById('ergebnis-text')!;

    if (reactionResult == null) {
        zeit.textContent = '–';
        text.textContent = 'Kein Ergebnis';
        return;
    }

    zeit.textContent = `${(reactionResult / 1000).toFixed(2)} s`;
    text.textContent =
        reactionResult < 1500  ?'Schnell':
        reactionResult < 3000 ? 'Mittlere Reaktionszeit':
                                'Da geht noch was';
}

showScreen('intro'); 
showIntro();