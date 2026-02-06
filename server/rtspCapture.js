import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegPath.path);

const CAPTURE_DIR = path.join(__dirname, 'captures');
const RTSP_STREAMS = [
  'rtsp://192.168.1.192:554/stream/main',
  'rtsp://192.168.1.190:554/stream/main'
];

if (!fs.existsSync(CAPTURE_DIR)) {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

let lastCaptures = {
  camera1: null,
  camera2: null
};

let captureAttempts = {
  camera1: false,
  camera2: false
};

function captureFrame(rtspUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Capture timeout'));
    }, 10000);

    ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport', 'tcp',
        '-stimeout', '5000000'
      ])
      .outputOptions([
        '-vframes', '1',
        '-q:v', '2'
      ])
      .output(outputPath)
      .on('end', () => {
        clearTimeout(timeout);
        resolve(outputPath);
      })
      .on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .run();
  });
}

export async function captureFromStream(streamIndex) {
  const rtspUrl = RTSP_STREAMS[streamIndex];
  const cameraKey = `camera${streamIndex + 1}`;
  const outputPath = path.join(CAPTURE_DIR, `${cameraKey}.jpg`);

  try {
    captureAttempts[cameraKey] = true;
    await captureFrame(rtspUrl, outputPath);

    const imageBuffer = fs.readFileSync(outputPath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    lastCaptures[cameraKey] = base64Image;

    console.log(`Successfully captured frame from ${cameraKey}`);
    return base64Image;
  } catch (error) {
    console.error(`Error capturing from ${cameraKey}:`, error.message);
    return null;
  }
}

export async function captureFromBothStreams() {
  const results = await Promise.allSettled([
    captureFromStream(0),
    captureFromStream(1)
  ]);

  return {
    camera1: results[0].status === 'fulfilled' ? results[0].value : null,
    camera2: results[1].status === 'fulfilled' ? results[1].value : null
  };
}

export function getLastCaptures() {
  return lastCaptures;
}

export function hasCaptureAttempts() {
  return captureAttempts.camera1 || captureAttempts.camera2;
}

export function initPeriodicCapture(intervalMs = 5000) {
  console.log('Starting periodic RTSP capture...');

  captureFromBothStreams();

  setInterval(async () => {
    await captureFromBothStreams();
  }, intervalMs);
}
