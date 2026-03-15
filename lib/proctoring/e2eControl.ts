'use client';

import type { FaceAssessment, FaceStatus } from '@/lib/proctoring/faceMonitor';

export type E2ECameraState = 'live' | 'muted' | 'ended';
export type E2ECameraPermission = 'granted' | 'denied' | 'not_found' | 'error';

interface E2EProctoringState {
  faceStatus: FaceStatus;
  cameraState: E2ECameraState;
  cameraPermission: E2ECameraPermission;
  yaw: number;
  pitch: number;
  roll: number;
  confidence: number;
}

type E2EProctoringPatch = Partial<E2EProctoringState>;

interface E2EProctoringController {
  getState: () => E2EProctoringState;
  setState: (patch: E2EProctoringPatch) => E2EProctoringState;
  reset: () => E2EProctoringState;
}

const DEFAULT_STATE: E2EProctoringState = {
  faceStatus: 'ok',
  cameraState: 'live',
  cameraPermission: 'granted',
  yaw: 0,
  pitch: 0,
  roll: 0,
  confidence: 0.95,
};

declare global {
  interface Window {
    __quizProE2EProctoring?: E2EProctoringController;
    __PW_E2E_PROCTORING__?: boolean;
  }
}

function shouldEnableE2EProctoring(): boolean {
  if (process.env.NEXT_PUBLIC_E2E_PROCTORING !== '1') return false;
  if (typeof window === 'undefined') return false;
  return window.__PW_E2E_PROCTORING__ === true;
}

function ensureController(): E2EProctoringController | null {
  if (typeof window === 'undefined') return null;
  if (!shouldEnableE2EProctoring()) return null;

  if (!window.__quizProE2EProctoring) {
    let state: E2EProctoringState = { ...DEFAULT_STATE };
    window.__quizProE2EProctoring = {
      getState: () => ({ ...state }),
      setState: (patch) => {
        state = { ...state, ...patch };
        return { ...state };
      },
      reset: () => {
        state = { ...DEFAULT_STATE };
        return { ...state };
      },
    };
  }

  return window.__quizProE2EProctoring;
}

export function isE2EProctoringEnabled(): boolean {
  return shouldEnableE2EProctoring();
}

export function getE2EProctoringState(): E2EProctoringState | null {
  const controller = ensureController();
  return controller?.getState() ?? null;
}

export function getE2EAssessment(): FaceAssessment | null {
  const state = getE2EProctoringState();
  if (!state) return null;

  if (state.faceStatus === 'no_face') {
    return {
      status: 'no_face',
      yaw: null,
      pitch: null,
      roll: null,
      confidence: null,
    };
  }

  if (state.faceStatus === 'error') {
    return {
      status: 'error',
      yaw: null,
      pitch: null,
      roll: null,
      confidence: null,
    };
  }

  return {
    status: state.faceStatus,
    yaw: state.yaw,
    pitch: state.pitch,
    roll: state.roll,
    confidence: state.confidence,
  };
}

if (typeof window !== 'undefined') {
  ensureController();
}
