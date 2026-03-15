'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFaceMonitor, type FaceStatus } from '@/lib/proctoring/faceMonitor';
import {
  getE2EAssessment,
  getE2EProctoringState,
  isE2EProctoringEnabled,
} from '@/lib/proctoring/e2eControl';

interface ProctoringOptions {
  enabled: boolean;
  maxTabSwitches?: number;
  onTerminate: () => void;
  monitorIntervalMs?: number;
  faceViolationGraceMs?: number;
  cameraOffGraceMs?: number;
  faceRecoveryStableMs?: number;
  minConsecutiveSamples?: number;
  violationCooldownMs?: number;
  startFaceCheckTimeoutMs?: number;
  startFaceCheckStableMs?: number;
  startFaceCheckPollMs?: number;
  startupFaceGraceMs?: number;
  textEntryGraceMs?: number;
}

export type ProctoringEventType =
  | 'tab_switch'
  | 'fullscreen_exit'
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

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export function useProctoring(options: ProctoringOptions) {
  const {
    enabled,
    maxTabSwitches = 2,
    onTerminate,
    monitorIntervalMs = 1000,
    faceViolationGraceMs = 4000,
    cameraOffGraceMs = 3500,
    faceRecoveryStableMs = 1500,
    minConsecutiveSamples = 3,
    violationCooldownMs = 8000,
    startFaceCheckTimeoutMs = 10000,
    startFaceCheckStableMs = 2000,
    startFaceCheckPollMs = 400,
    startupFaceGraceMs = 1000,
    textEntryGraceMs = 2500,
  } = options;

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
  const policyViolationRef = useRef(0);
  const faceRearmPendingRef = useRef(false);
  const faceRecoverySinceRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const terminatedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullscreenRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraTrackCleanupRef = useRef<(() => void) | null>(null);
  const textEntryInteractionUntilRef = useRef(0);
  const cameraLifecycleStateRef = useRef<'live' | 'muted' | 'ended'>('live');
  const evaluationInFlightRef = useRef(false);
  const activeViolationRef = useRef<{
    type: 'camera_off' | 'no_face' | 'face_away' | null;
    since: number;
    consecutive: number;
    raised: boolean;
    lastRaisedAt: number;
  }>({ type: null, since: 0, consecutive: 0, raised: false, lastRaisedAt: 0 });

  const nowInSeconds = useCallback(
    () => Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)),
    [],
  );

  const clearTerminateTimeout = useCallback(() => {
    if (terminateTimeoutRef.current) {
      clearTimeout(terminateTimeoutRef.current);
      terminateTimeoutRef.current = null;
    }
  }, []);

  const clearFullscreenRetryTimeout = useCallback(() => {
    if (fullscreenRetryTimeoutRef.current) {
      clearTimeout(fullscreenRetryTimeoutRef.current);
      fullscreenRetryTimeoutRef.current = null;
    }
  }, []);

  const clearCameraTrackListeners = useCallback(() => {
    cameraTrackCleanupRef.current?.();
    cameraTrackCleanupRef.current = null;
    cameraLifecycleStateRef.current = 'live';
  }, []);

  const scheduleTerminate = useCallback(() => {
    clearTerminateTimeout();
    terminateTimeoutRef.current = setTimeout(() => {
      terminateTimeoutRef.current = null;
      terminateRef.current();
    }, 1500);
  }, [clearTerminateTimeout]);

  const stopFaceMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
    clearFullscreenRetryTimeout();
    evaluationInFlightRef.current = false;
    faceRearmPendingRef.current = false;
    faceRecoverySinceRef.current = null;
    activeViolationRef.current = { type: null, since: 0, consecutive: 0, raised: false, lastRaisedAt: 0 };
  }, [clearFullscreenRetryTimeout]);

  const appendEvent = useCallback((event: ProctoringEvent) => {
    setState((s) => ({ ...s, violationEvents: [...s.violationEvents, event] }));
  }, []);

  const getFullscreenElement = useCallback(() => {
    const fullscreenDocument = document as FullscreenDocument;
    return (
      document.fullscreenElement ??
      fullscreenDocument.webkitFullscreenElement ??
      fullscreenDocument.msFullscreenElement ??
      null
    );
  }, []);

  const resetActiveViolation = useCallback(() => {
    activeViolationRef.current = { type: null, since: 0, consecutive: 0, raised: false, lastRaisedAt: 0 };
  }, []);

  const isTextEntryElement = useCallback((element: Element | null) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.isContentEditable) return true;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName === 'input') {
      const input = element as HTMLInputElement;
      const type = (input.type || 'text').toLowerCase();
      return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type);
    }
    return element.closest('.monaco-editor') !== null || element.getAttribute('role') === 'textbox';
  }, []);

  const noteTextEntryInteraction = useCallback(() => {
    textEntryInteractionUntilRef.current = Date.now() + textEntryGraceMs;
  }, [textEntryGraceMs]);

  const isTextEntryInteractionActive = useCallback(() => {
    const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
    if (isTextEntryElement(activeElement)) {
      noteTextEntryInteraction();
      return true;
    }
    return Date.now() < textEntryInteractionUntilRef.current;
  }, [isTextEntryElement, noteTextEntryInteraction]);

  const shouldSuppressFaceViolation = useCallback(() => {
    const withinStartupGrace = Date.now() - startTimeRef.current < startupFaceGraceMs;
    return withinStartupGrace || isTextEntryInteractionActive();
  }, [isTextEntryInteractionActive, startupFaceGraceMs]);

  const attachCameraTrackListeners = useCallback((stream: MediaStream) => {
    clearCameraTrackListeners();
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const markLive = () => {
      cameraLifecycleStateRef.current = 'live';
    };
    const markMuted = () => {
      cameraLifecycleStateRef.current = 'muted';
    };
    const markEnded = () => {
      cameraLifecycleStateRef.current = 'ended';
    };

    cameraLifecycleStateRef.current = track.readyState === 'live' ? 'live' : 'ended';
    track.addEventListener?.('mute', markMuted);
    track.addEventListener?.('unmute', markLive);
    track.addEventListener?.('ended', markEnded);
    stream.addEventListener?.('inactive', markEnded as EventListener);

    cameraTrackCleanupRef.current = () => {
      track.removeEventListener?.('mute', markMuted);
      track.removeEventListener?.('unmute', markLive);
      track.removeEventListener?.('ended', markEnded);
      stream.removeEventListener?.('inactive', markEnded as EventListener);
    };
  }, [clearCameraTrackListeners]);

  const applyPolicyViolation = useCallback(
    (
      type: 'fullscreen_exit' | 'camera_off' | 'no_face' | 'face_away',
      details?: Record<string, unknown>,
    ) => {
      if (terminatedRef.current) return;

      policyViolationRef.current += 1;
      const nextCount = policyViolationRef.current;
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
        scheduleTerminate();
        return;
      }

      if (type === 'no_face' || type === 'face_away') {
        // Re-arm only after stable recovery to reduce false second violations.
        faceRearmPendingRef.current = true;
        faceRecoverySinceRef.current = null;
      }

      const warningMap: Record<typeof type, string> = {
        fullscreen_exit:
          'Warning: Fullscreen mode was exited. Return to fullscreen now. Next violation will terminate your quiz.',
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
    [appendEvent, nowInSeconds, scheduleTerminate, stopFaceMonitoring],
  );

  const evaluateFaceState = useCallback(
    async (videoEl: HTMLVideoElement) => {
      if (terminatedRef.current || !streamRef.current) return;
      if (evaluationInFlightRef.current) return;
      evaluationInFlightRef.current = true;

      const registerSustainedViolation = (
        type: 'camera_off' | 'no_face' | 'face_away',
        details?: Record<string, unknown>,
      ) => {
        if ((type === 'no_face' || type === 'face_away') && shouldSuppressFaceViolation()) {
          faceRecoverySinceRef.current = null;
          resetActiveViolation();
          return;
        }

        if ((type === 'no_face' || type === 'face_away') && faceRearmPendingRef.current) {
          return;
        }

        const now = Date.now();
        const graceMs = type === 'camera_off' ? cameraOffGraceMs : faceViolationGraceMs;
        const current = activeViolationRef.current;
        if (current.type !== type) {
          activeViolationRef.current = {
            type,
            since: now,
            consecutive: 1,
            raised: false,
            lastRaisedAt: 0,
          };
          return;
        }

        const nextConsecutive = current.consecutive + 1;
        const inCooldown = current.lastRaisedAt > 0 && now - current.lastRaisedAt < violationCooldownMs;
        const sustained = now - current.since >= graceMs && nextConsecutive >= minConsecutiveSamples;
        if (!sustained || inCooldown) {
          activeViolationRef.current = {
            ...current,
            consecutive: nextConsecutive,
          };
          return;
        }

        activeViolationRef.current = {
          type,
          since: now,
          consecutive: 0,
          raised: true,
          lastRaisedAt: now,
        };
        applyPolicyViolation(type, details);
      };

      try {
        const e2eState = getE2EProctoringState();
        if (e2eState && e2eState.cameraState !== 'live') {
          setState((s) => ({ ...s, faceStatus: 'error' }));
          registerSustainedViolation('camera_off');
          return;
        }

        if (!e2eState) {
          const track = streamRef.current.getVideoTracks()[0];
          const streamInactive = streamRef.current.active === false;
          const cameraInterrupted =
            !track ||
            track.readyState !== 'live' ||
            track.muted ||
            streamInactive ||
            cameraLifecycleStateRef.current !== 'live';
          if (cameraInterrupted) {
            setState((s) => ({ ...s, faceStatus: 'error' }));
            registerSustainedViolation('camera_off');
            return;
          }
        }

        const monitor = e2eState ? null : await getFaceMonitor();
        const e2eAssessment = getE2EAssessment();
        const assessment = e2eAssessment ?? (await monitor!.assess(videoEl));
        setState((s) => ({ ...s, faceStatus: assessment.status, cameraError: null }));

        if (assessment.status === 'ok') {
          if (faceRearmPendingRef.current) {
            if (faceRecoverySinceRef.current === null) {
              faceRecoverySinceRef.current = Date.now();
            } else if (Date.now() - faceRecoverySinceRef.current >= faceRecoveryStableMs) {
              faceRearmPendingRef.current = false;
              faceRecoverySinceRef.current = null;
            }
          }
          resetActiveViolation();
          return;
        }

        if (assessment.status === 'no_face' || assessment.status === 'face_away') {
          faceRecoverySinceRef.current = null;
          registerSustainedViolation(assessment.status, {
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
      } finally {
        evaluationInFlightRef.current = false;
      }
    },
    [
      applyPolicyViolation,
      cameraOffGraceMs,
      faceRecoveryStableMs,
      faceViolationGraceMs,
      minConsecutiveSamples,
      resetActiveViolation,
      shouldSuppressFaceViolation,
      violationCooldownMs,
    ],
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
        if (!isE2EProctoringEnabled()) {
          await waitForVideoReady(videoEl);
        }
        const startAt = Date.now();
        let okSince: number | null = null;

        while (Date.now() - startAt < startFaceCheckTimeoutMs) {
          const e2eAssessment = getE2EAssessment();
          const assessment = e2eAssessment ?? (await (await getFaceMonitor()).assess(videoEl));
          setState((s) => ({ ...s, faceStatus: assessment.status, cameraError: null }));
          if (assessment.status === 'ok') {
            if (okSince === null) okSince = Date.now();
            if (Date.now() - okSince >= startFaceCheckStableMs) {
              setState((s) => ({ ...s, cameraError: null }));
              return true;
            }
          } else {
            okSince = null;
          }
          await new Promise((resolve) => setTimeout(resolve, startFaceCheckPollMs));
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
    [waitForVideoReady, startFaceCheckTimeoutMs, startFaceCheckStableMs, startFaceCheckPollMs],
  );

  const startFaceMonitoring = useCallback(
    async (videoEl: HTMLVideoElement) => {
      if (monitorIntervalRef.current || terminatedRef.current) return;
      if (!isE2EProctoringEnabled()) {
        await waitForVideoReady(videoEl);
      }
      await evaluateFaceState(videoEl);
      monitorIntervalRef.current = setInterval(() => {
        void evaluateFaceState(videoEl);
      }, monitorIntervalMs);
    },
    [evaluateFaceState, waitForVideoReady, monitorIntervalMs],
  );

  const requestFullscreen = useCallback(async () => {
    if (terminatedRef.current) return;
    try {
      if (getFullscreenElement()) {
        setState((s) => ({ ...s, isFullscreen: true }));
        return true;
      }

      const el = document.documentElement as FullscreenElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      } else {
        setState((s) => ({ ...s, isFullscreen: false }));
        return false;
      }
      setState((s) => ({ ...s, isFullscreen: true }));
      return true;
    } catch {
      setState((s) => ({ ...s, isFullscreen: false }));
      return false;
    }
  }, [getFullscreenElement]);

  const requestCamera = useCallback(async () => {
    if (isE2EProctoringEnabled()) {
      const e2eState = getE2EProctoringState();
      const permission = e2eState?.cameraPermission ?? 'granted';
      if (permission !== 'granted') {
        const message =
          permission === 'denied'
            ? 'Camera permission denied. Please allow camera access to proceed.'
            : permission === 'not_found'
              ? 'No camera found. Please connect a camera to proceed.'
              : 'Failed to access camera. Please check your device settings.';
        setState((s) => ({ ...s, cameraError: message }));
        return false;
      }

      const syntheticStream = new MediaStream();
      streamRef.current = syntheticStream;
      cameraLifecycleStateRef.current = 'live';
      setState((s) => ({ ...s, cameraStream: syntheticStream, cameraError: null }));
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      attachCameraTrackListeners(stream);
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
  }, [attachCameraTrackListeners]);

  const dismissWarning = useCallback(() => {
    setState((s) => ({ ...s, showWarning: false, warningMessage: '' }));
  }, []);

  const markReady = useCallback(() => {
    startTimeRef.current = Date.now();
    policyViolationRef.current = 0;
    switchCountRef.current = 0;
    terminatedRef.current = false;
    faceRearmPendingRef.current = false;
    faceRecoverySinceRef.current = null;
    textEntryInteractionUntilRef.current = 0;
    clearFullscreenRetryTimeout();
    resetActiveViolation();
    setState((s) => ({
      ...s,
      tabSwitchCount: 0,
      cameraError: null,
      showWarning: false,
      warningMessage: '',
      terminated: false,
      ready: true,
      faceStatus: 'no_face',
      violationCount: 0,
      violationEvents: [],
      terminatedReason: null,
    }));
  }, [clearFullscreenRetryTimeout, resetActiveViolation]);

  const cleanup = useCallback(() => {
    terminatedRef.current = true;
    clearTerminateTimeout();
    clearCameraTrackListeners();
    stopFaceMonitoring();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const fullscreenDocument = document as FullscreenDocument;
    if (getFullscreenElement()) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (fullscreenDocument.webkitExitFullscreen) {
        void fullscreenDocument.webkitExitFullscreen();
      } else if (fullscreenDocument.msExitFullscreen) {
        void fullscreenDocument.msExitFullscreen();
      }
    }
    setState((s) => ({
      ...s,
      cameraStream: null,
      isFullscreen: false,
      ready: false,
      showWarning: false,
      faceStatus: 'no_face',
    }));
  }, [clearCameraTrackListeners, clearTerminateTimeout, getFullscreenElement, stopFaceMonitoring]);

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
        scheduleTerminate();
      } else {
        const remaining = maxTabSwitches - count;
        const remainingLabel =
          remaining > 1 ? `${remaining} more will terminate your quiz.` : 'One more will terminate your quiz.';
        setState((s) => ({
          ...s,
          tabSwitchCount: count,
          showWarning: true,
          warningMessage: `Warning: Tab switch detected (${count}/${maxTabSwitches}). ${remainingLabel}`,
        }));
      }
    };

    const preventRestrictedAction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextEntryElement(e.target as Element | null)) {
        noteTextEntryInteraction();
      }
      const key = e.key.toLowerCase();
      const blockedModifierShortcut =
        (e.ctrlKey || e.metaKey) && ['a', 'c', 'p', 's', 'v', 'x'].includes(key);
      const blockedFullscreenKey = key === 'escape' || key === 'f11';

      if (!blockedModifierShortcut && !blockedFullscreenKey) return;

      e.preventDefault();
      e.stopPropagation();
    };

    const handleFullscreenChange = () => {
      if (terminatedRef.current) return;
      const inFs = !!getFullscreenElement();
      setState((s) => ({ ...s, isFullscreen: inFs }));
      if (!inFs) {
        if (isTextEntryInteractionActive()) {
          clearFullscreenRetryTimeout();
          fullscreenRetryTimeoutRef.current = setTimeout(() => {
            fullscreenRetryTimeoutRef.current = null;
            if (!terminatedRef.current && !getFullscreenElement()) {
              void requestFullscreen();
            }
          }, textEntryGraceMs);
          return;
        }
        applyPolicyViolation('fullscreen_exit');
        setTimeout(() => {
          if (!terminatedRef.current) void requestFullscreen();
        }, 150);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (isTextEntryElement(e.target as Element | null)) {
        noteTextEntryInteraction();
      }
    };

    const handleInput = (e: Event) => {
      if (isTextEntryElement(e.target as Element | null)) {
        noteTextEntryInteraction();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', preventRestrictedAction);
    document.addEventListener('cut', preventRestrictedAction);
    document.addEventListener('paste', preventRestrictedAction);
    document.addEventListener('contextmenu', preventRestrictedAction);
    document.addEventListener('selectstart', preventRestrictedAction);
    document.addEventListener('dragstart', preventRestrictedAction);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', preventRestrictedAction);
      document.removeEventListener('cut', preventRestrictedAction);
      document.removeEventListener('paste', preventRestrictedAction);
      document.removeEventListener('contextmenu', preventRestrictedAction);
      document.removeEventListener('selectstart', preventRestrictedAction);
      document.removeEventListener('dragstart', preventRestrictedAction);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as EventListener);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      clearFullscreenRetryTimeout();
    };
  }, [
    enabled,
    getFullscreenElement,
    state.ready,
    maxTabSwitches,
    requestFullscreen,
    appendEvent,
    clearFullscreenRetryTimeout,
    nowInSeconds,
    isTextEntryElement,
    isTextEntryInteractionActive,
    noteTextEntryInteraction,
    stopFaceMonitoring,
    scheduleTerminate,
    applyPolicyViolation,
    textEntryGraceMs,
  ]);

  useEffect(() => {
    return () => {
      clearTerminateTimeout();
      clearCameraTrackListeners();
      clearFullscreenRetryTimeout();
      stopFaceMonitoring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [clearCameraTrackListeners, clearFullscreenRetryTimeout, clearTerminateTimeout, stopFaceMonitoring]);

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
