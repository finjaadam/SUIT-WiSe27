import { createModel, type Model, type KaldiRecognizer } from 'vosk-browser';
import type { RecognizerMessage } from 'vosk-browser/dist/interfaces';

export type VoiceCommand = 'einloggen' | 'zurück';

let model: Model | null = null;
let recognizer: KaldiRecognizer | null = null;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;

let lastTriggerTime = 0;
const COOLDOWN_MS = 1500;

export async function startVoiceCommands(
  onCommandDetected: (command: VoiceCommand) => void
): Promise<void> {
  // 1. Modell aus dem public-Ordner laden
  if (!model) {
    model = await createModel('/models/vosk-model-small-de-0.15.tar.gz');
  }

  // 2. Recognizer mit eingeschränkter Grammatik erstellen
  const grammar = JSON.stringify(['einloggen', 'zurück', '[unk]']);
  recognizer = new model.KaldiRecognizer(16000, grammar);

  const handleDetection = (text: string) => {
    const now = Date.now();
    if (now - lastTriggerTime < COOLDOWN_MS) return;

    if (text.includes('einloggen')) {
      lastTriggerTime = now;
      onCommandDetected('einloggen');
    } else if (text.includes('zurück')) {
      lastTriggerTime = now;
      onCommandDetected('zurück');
    }
  };

 // 3. Echtzeit-Erkennung & Fallback mit Discriminated Union Check
  recognizer.on('partialresult', (message: RecognizerMessage) => {
    if (message.event === 'partialresult') {
      handleDetection(message.result.partial);
    }
  });

  recognizer.on('result', (message: RecognizerMessage) => {
    if (message.event === 'result') {
      handleDetection(message.result.text);
    }
  });

  // 4. Mikrofon mit Störgeräusch-Filter anfordern
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 16000,
    },
  });

  // 5. Audio-Stream an Vosk weiterleiten
  audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(mediaStream);

  const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1);
  recognizerNode.onaudioprocess = (event: AudioProcessingEvent) => {
    try {
      recognizer?.acceptWaveform(event.inputBuffer);
    } catch (error) {
      console.error('Vosk Audio-Fehler:', error);
    }
  };

  source.connect(recognizerNode);
  recognizerNode.connect(audioContext.destination);
}

export async function stopVoiceCommands(): Promise<void> {
  if (recognizer) {
    recognizer.remove();
    recognizer = null;
  }
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}