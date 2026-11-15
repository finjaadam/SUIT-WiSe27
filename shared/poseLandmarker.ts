import {PoseLandmarker} from '@mediapipe/tasks-vision';
// WASM comes straight from the installed package, the model from shared/models
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import modelAssetPath from './models/pose_landmarker_full.task?url';

export function createPoseLandmarker(): Promise<PoseLandmarker> {
    return PoseLandmarker.createFromOptions({wasmLoaderPath, wasmBinaryPath}, {
        baseOptions: {modelAssetPath},
        runningMode: 'VIDEO',
    });
}
