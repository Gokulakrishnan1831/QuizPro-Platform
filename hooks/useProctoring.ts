'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFaceMonitor, type FaceStatus } from '@/lib/proctoring/faceMonitor';

interface ProctoringOptions {
  enabled: boolean;
  maxTabSwitches?: number;
  onTerminate: () => void;
}

export type ProctoringEventType =
  | 'tab_switch'
  | 'camera_off'
  | 'no_face'
  | 'face_away';

export interface ProctoringEvent {
  type: ProctoringEventType;
  atSecond: number;
  details?: Record<string, unknown>;
}

interface ProctoringState {
  tabSwitchCount: number;
  isFullscreen: boolean;
  cameraStream: MediaStream | null;
  cameraError: string | null;
  showWarning: boolean;
  warningMessage: string;
  terminated: boolean;
  ready: boolean;
  faceStatus: FaceStatus;
  violationCount: number;
  violationEvents: ProctoringEvent[];
  terminatedReason: ProctoringEventType | null;
}

export function useProctoring(options: ProctoringOptions) {
  const { enabled, maxTabSwitches = 2, onTerminate } = options;

  const [state, setState] = useState<ProctoringState>({
    tabSwitchCount: 0,
    isFullscreen: false,
    cameraStream: null,
    cameraError: null,
    showWarning: false,
    warningMessage: '',
    terminated: false,
    ready: false,
    faceStatus: 'no_face',
    violationCount: 0,
    violationEvents: [],
    terminatedReason: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const terminateRef = useRef(onTerminate);
  terminateRef.current = onTerminate;

  const switchCountRef = useRef(0);
  const faceViolationRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminatedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeViolationRef = useRef<{
    type: 'camera_off' | 'no_face' | 'face_away' | null;
    since: number;
    raised: boolean;
  }>({ type: null, since: 0, raised: false });

  const nowInSeconds = useCallback(
    () => Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)),
    [],
  );

  const stopFaceMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    activeViolationRef.current = { type: null, since: 0, raised: false };
  }, []);

  const appendEvent = useCallback((event: ProctoringEvent) => {
    setState((s) => ({ ...s, violationEvents: [...s.violationEvents, event] }));
  }, []);

  const applyFaceViolation = useCallback(
    (type: 'camera_off' | 'no_face' | 'face_away', details?: Record<string, unknown>) => {
      if (terminatedRef.current) return;

      faceViolationRef.current += 1;
      const nextCount = faceViolationRef.current;
      appendEvent({ type, atSecond: nowInSeconds(), details });

      if (nextCount >= 2) {
        terminatedRef.current = true;
        setState((s) => ({
          ...s,
          violationCount: nextCount,
          showWarning: true,
          warningMessage:
            'Second proctoring violation detected. Your quiz has been terminated.',
          terminated: true,
          terminatedReason: type,
        }));
        stopFaceMonitoring();
        setTimeout(() => terminateRef.current(), 1500);
        return;
      }

      const warningMap: Record<typeof type, string> = {
        camera_off:
          'Warning: Camera feed was interrupted. Keep your camera on at all times. Next violation will terminate your quiz.',
        no_face:
          'Warning: Your face is not visible. Stay in frame. Next violation will terminate your quiz.',
        face_away:
          'Warning: Please face the camera directly. Next violation will terminate your quiz.',
      };

      setState((s) => ({
        ...s,
        violationCount: nextCount,
        showWarning: true,
        warningMessage: warningMap[type],
      }));
    },
    [appendEvent, nowInSeconds, stopFaceMonitoring],
  );

  const evaluateFaceState = useCallback(
    async (videoEl: HTMLVideoElement) => {
      if (terminatedRef.current || !streamRef.current) return;

      const track = streamRef.current.getVideoTracks()[0];
      if (!track || track.readyState !== 'live' || track.muted) {
        setState((s) => ({ ...s, faceStatus: 'error' }));
        const current = activeViolationRef.current;
        if (current.type !== 'camera_off') {
          activeViolationRef.current = { type: 'camera_off', since: Date.now(), raised: false };
          return;
        }
        if (Date.now() - current.since >= 1000 && !current.raised) {
          activeViolationRef.current.raised = true;
          applyFaceViolation('camera_off');
        }
        return;
      }

      try {
        const monitor = await getFaceMonitor();
        const assessment = await monitor.assess(videoEl);
        setState((s) => ({ ...s, faceStatus: assessment.status, cameraError: null }));

        if (assessment.status === 'ok') {
          activeViolationRef.current = { type: null, since: 0, raised: false };
          return;
        }
        if (assessment.status !== 'no_face' && assessment.status !== 'face_away') {
          return;
        }

        const current = activeViolationRef.current;
        if (current.type !== assessment.status) {
          activeViolationRef.current = {
            type: assessment.status,
            since: Date.now(),
            raised: false,
          };
          return;
        }
        if (Date.now() - current.since >= 2000 && !current.raised) {
          activeViolationRef.current.raised = true;
          applyFaceViolation(assessment.status, {
            yaw: assessment.yaw,
            pitch: assessment.pitch,
            confidence: assessment.confidence,
          });
        }
      } catch {
        setState((s) => ({
          ...s,
          faceStatus: 'error',
          cameraError:
            'Face detection initialization failed. Please refresh and allow camera access.',
        }));
      }
    },
    [applyFaceViolation],
  );

  const waitForVideoReady = useCallback(async (videoEl: HTMLVideoElement) => {
    if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timeoutId = setTimeout(done, 3000);
      const onReady = () => {
        clearTimeout(timeoutId);
        videoEl.removeEventListener('loadeddata', onReady);
        done();
      };
      videoEl.addEventListener('loadeddata', onReady, { once: true });
    });
  }, []);

  const runStartFaceCheck = useCallback(
    async (videoEl: HTMLVideoElement) => {
      try {
        await waitForVideoReady(videoEl);
        const monitor = await getFaceMonitor();
        const startAt = Date.now();
        let okSince: number | null = null;

        while (Date.now() - startAt < 10000) {
          const assessment = await monitor.assess(videoEl);
          setState((s) => ({ ...s, faceStatus: assessment.status, cameraError: null }));
          if (assessment.status === 'ok') {
            if (okSince === null) okSince = Date.now();
            if (Date.now() - okSince >= 2000) {
              setState((s) => ({ ...s, cameraError: null }));
              return true;
            }
          } else {
            okSince = null;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        setState((s) => ({
          ...s,
          cameraError:
            'Face verification failed. Keep your face centered and facing the camera.',
        }));
        return false;
      } catch {
        setState((s) => ({
          ...s,
          cameraError:
            'Face detection failed to start. Please refresh and allow camera access.',
        }));
        return false;
      }
    },
    [waitForVideoReady],
  );

  const startFaceMonitoring = useCallback(
    async (videoEl: HTMLVideoElement) => {
      if (monitorIntervalRef.current || terminatedRef.current) return;
      await waitForVideoReady(videoEl);
      await evaluateFaceState(videoEl);
      monitorIntervalRef.current = setInterval(() => {
        void evaluateFaceState(videoEl);
      }, 1000);
    },
    [evaluateFaceState, waitForVideoReady],
  );

  const requestFullscreen = useCallback(async () => {
    if (terminatedRef.current) return;
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      setState((s) => ({ ...s, isFullscreen: true }));
    } catch {
      setState((s) => ({ ...s, isFullscreen: false }));
    }
  }, []);

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      setState((s) => ({ ...s, cameraStream: stream, cameraError: null }));
      return true;
    } catch (err: any) {
      const message =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access to proceed.'
          : err?.name === 'NotFoundError'
            ? 'No camera found. Please connect a camera to proceed.'
            : 'Failed to access camera. Please check your device settings.';
      setState((s) => ({ ...s, cameraError: message }));
      return false;
    }
  }, []);

  const dismissWarning = useCallback(() => {
    setState((s) => ({ ...s, showWarning: false, warningMessage: '' }));
  }, []);

  const markReady = useCallback(() => {
    startTimeRef.current = Date.now();
    faceViolationRef.current = 0;
    setState((s) => ({ ...s, ready: true }));
  }, []);

  const cleanup = useCallback(() => {
    terminatedRef.current = true;
    stopFaceMonitoring();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setState((s) => ({
      ...s,
      cameraStream: null,
      isFullscreen: false,
      ready: false,
      showWarning: false,
      faceStatus: 'no_face',
    }));
  }, [stopFaceMonitoring]);

  useEffect(() => {
    if (!enabled || !state.ready) return;

    const handleVisibilityChange = () => {
      if (!document.hidden || terminatedRef.current) return;
      if (debounceRef.current) return;

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
      }, 200);

      switchCountRef.current += 1;
      const count = switchCountRef.current;
      appendEvent({ type: 'tab_switch', atSecond: nowInSeconds() });

      if (count >= maxTabSwitches) {
        terminatedRef.current = true;
        setState((s) => ({
          ...s,
          tabSwitchCount: count,
          showWarning: true,
          warningMessage: `You have switched tabs ${count} times. Your quiz has been terminated.`,
          terminated: true,
          terminatedReason: 'tab_switch',
        }));
        stopFaceMonitoring();
        setTimeout(() => terminateRef.current(), 1500);
      } else {
        setState((s) => ({
          ...s,
          tabSwitchCount: count,
          showWarning: true,
          warningMessage: `Warning: Tab switch detected (${count}/${maxTabSwitches}). One more will terminate your quiz.`,
        }));
      }
    };

    const preventCopy = (e: Event) => {
      e.preventDefault();
    };

    const handleFullscreenChange = () => {
      if (terminatedRef.current) return;
      const inFs = !!document.fullscreenElement;
      setState((s) => ({ ...s, isFullscreen: inFs }));
      if (!inFs) {
        setTimeout(() => {
          if (!terminatedRef.current) void requestFullscreen();
        }, 800);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [
    enabled,
    state.ready,
    maxTabSwitches,
    requestFullscreen,
    appendEvent,
    nowInSeconds,
    stopFaceMonitoring,
  ]);

  useEffect(() => {
    return () => {
      stopFaceMonitoring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [stopFaceMonitoring]);

  return {
    ...state,
    requestFullscreen,
    requestCamera,
    dismissWarning,
    markReady,
    cleanup,
    runStartFaceCheck,
    startFaceMonitoring,
    stopFaceMonitoring,
  };
}
