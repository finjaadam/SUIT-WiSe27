import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult, DrawingUtils } from '@mediapipe/tasks-vision';

const video      = document.getElementById('video')       as HTMLVideoElement;
const canvas     = document.getElementById('canvas')      as HTMLCanvasElement;
const ctx        = canvas.getContext('2d')                as CanvasRenderingContext2D;

let drawingUtils: DrawingUtils | undefined;
let poseLandmarker: PoseLandmarker;

async function initMediaPipe() {
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

        await startCamera();
    } catch (err) {
        console.error('KRITISCHER FEHLER:', err);
    }
}

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
    });
    video.srcObject = stream;
    video.addEventListener('loadeddata', () => {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play();
        renderLoop();
    });
}

let lastVideoTime = -1;

function renderLoop(): void {
    if (video.currentTime !== lastVideoTime) {
        const startTimeMs = performance.now();
        const poseLandmarkerResult = poseLandmarker.detectForVideo(video, startTimeMs);

        console.log(poseLandmarkerResult);
        
        displayVideoResult(poseLandmarkerResult);
        
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

initMediaPipe();