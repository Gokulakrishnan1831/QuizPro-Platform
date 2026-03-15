export type FaceStatus = 'ok' | 'no_face' | 'face_away' | 'error';

export interface FaceAssessment {
  status: FaceStatus;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  confidence: number | null;
}

interface FaceMonitor {
  assess(video: HTMLVideoElement): Promise<FaceAssessment>;
}

type FaceLandmarkerResult = {
  faceLandmarks?: unknown[];
  faceBlendshapes?: Array<{ categories?: Array<{ score?: number }> }>;
  facialTransformationMatrixes?: Array<{ data?: number[] }>;
};

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
const WASM_BASE_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

let monitorPromise: Promise<FaceMonitor> | null = null;

interface TemporalState {
  lastSeenAt: number;
  smoothedYaw: number | null;
  smoothedPitch: number | null;
  smoothedRoll: number | null;
  facingAway: boolean;
  consecutiveNoFace: number;
}

function degrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function rotationFromMatrix(matrix: number[]) {
  // Matrix layout follows the 4x4 row-major transform from MediaPipe.
  const r00 = matrix[0] ?? 1;
  const r01 = matrix[1] ?? 0;
  const r02 = matrix[2] ?? 0;
  const r10 = matrix[4] ?? 0;
  const r11 = matrix[5] ?? 1;
  const r12 = matrix[6] ?? 0;
  const r20 = matrix[8] ?? 0;
  const r22 = matrix[10] ?? 1;

  const yaw = degrees(Math.atan2(r02, r22));
  const pitch = degrees(Math.asin(clamp(-r12, -1, 1)));
  const roll = degrees(Math.atan2(r10, r00 + r01 * 0.0001 + r11 * 0.0001));
  return { yaw, pitch, roll };
}

function smoothValue(prev: number | null, next: number, alpha = 0.45): number {
  if (prev === null || !Number.isFinite(prev)) return next;
  return prev * (1 - alpha) + next * alpha;
}

function isFacingAway(yaw: number, pitch: number, currentlyAway: boolean): boolean {
  // Hysteresis avoids rapid status toggling near thresholds.
  if (currentlyAway) {
    return Math.abs(yaw) > 24 || Math.abs(pitch) > 16;
  }
  return Math.abs(yaw) > 32 || Math.abs(pitch) > 22;
}

async function createMonitor(): Promise<FaceMonitor> {
  const temporal: TemporalState = {
    lastSeenAt: 0,
    smoothedYaw: null,
    smoothedPitch: null,
    smoothedRoll: null,
    facingAway: false,
    consecutiveNoFace: 0,
  };

  const tasksVision = await import('@mediapipe/tasks-vision');
  const vision = await tasksVision.FilesetResolver.forVisionTasks(WASM_BASE_PATH);
  const faceLandmarker = await tasksVision.FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.45,
    minFacePresenceConfidence: 0.45,
    minTrackingConfidence: 0.4,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });

  return {
    async assess(video: HTMLVideoElement): Promise<FaceAssessment> {
      const now = performance.now();
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return {
          status: 'no_face',
          yaw: null,
          pitch: null,
          roll: null,
          confidence: null,
        };
      }

      const result = faceLandmarker.detectForVideo(
        video,
        now,
      ) as FaceLandmarkerResult;

      const hasFace = Array.isArray(result.faceLandmarks) && result.faceLandmarks.length > 0;
      if (!hasFace) {
        temporal.consecutiveNoFace += 1;
        const recentlySeen = temporal.lastSeenAt > 0 && now - temporal.lastSeenAt <= 1200;
        // Tolerate brief detector dropouts to reduce flicker/false warnings.
        if (recentlySeen && temporal.consecutiveNoFace <= 1) {
          return {
            status: temporal.facingAway ? 'face_away' : 'ok',
            yaw: temporal.smoothedYaw,
            pitch: temporal.smoothedPitch,
            roll: temporal.smoothedRoll,
            confidence: null,
          };
        }
        return {
          status: 'no_face',
          yaw: null,
          pitch: null,
          roll: null,
          confidence: null,
        };
      }
      temporal.lastSeenAt = now;
      temporal.consecutiveNoFace = 0;

      const matrix = result.facialTransformationMatrixes?.[0]?.data ?? [];
      const pose = matrix.length >= 11 ? rotationFromMatrix(matrix) : null;
      const confidence =
        result.faceBlendshapes?.[0]?.categories?.[0]?.score ?? null;

      const yaw = pose?.yaw ?? 0;
      const pitch = pose?.pitch ?? 0;
      const roll = pose?.roll ?? 0;
      temporal.smoothedYaw = smoothValue(temporal.smoothedYaw, yaw);
      temporal.smoothedPitch = smoothValue(temporal.smoothedPitch, pitch);
      temporal.smoothedRoll = smoothValue(temporal.smoothedRoll, roll);

      const stableYaw = temporal.smoothedYaw ?? yaw;
      const stablePitch = temporal.smoothedPitch ?? pitch;
      const stableRoll = temporal.smoothedRoll ?? roll;
      temporal.facingAway = isFacingAway(stableYaw, stablePitch, temporal.facingAway);
      return {
        status: temporal.facingAway ? 'face_away' : 'ok',
        yaw: stableYaw,
        pitch: stablePitch,
        roll: stableRoll,
        confidence,
      };
    },
  };
}

export async function getFaceMonitor(): Promise<FaceMonitor> {
  if (!monitorPromise) {
    monitorPromise = createMonitor();
  }
  return monitorPromise;
}
