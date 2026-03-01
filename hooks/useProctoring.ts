'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ProctoringOptions {
    enabled: boolean;
    maxTabSwitches?: number;
    onTerminate: () => void;
}

interface ProctoringState {
    tabSwitchCount: number;
    isFullscreen: boolean;
    cameraStream: MediaStream | null;
    cameraError: string | null;
    showWarning: boolean;
    warningMessage: string;
    terminated: boolean;
    ready: boolean; // true once camera + fullscreen are both active
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
    });

    const streamRef = useRef<MediaStream | null>(null);
    const terminateRef = useRef(onTerminate);
    terminateRef.current = onTerminate;

    const switchCountRef = useRef(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const terminatedRef = useRef(false);

    // ── Fullscreen ──────────────────────────────────────────────
    const requestFullscreen = useCallback(async () => {
        if (terminatedRef.current) return; // don't re-request after termination
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
            // Some browsers block fullscreen without user gesture
            setState((s) => ({ ...s, isFullscreen: false }));
        }
    }, []);

    // ── Camera ──────────────────────────────────────────────────
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

    // ── Dismiss warning ─────────────────────────────────────────
    const dismissWarning = useCallback(() => {
        setState((s) => ({ ...s, showWarning: false, warningMessage: '' }));
    }, []);

    // ── Mark ready ──────────────────────────────────────────────
    const markReady = useCallback(() => {
        setState((s) => ({ ...s, ready: true }));
    }, []);

    // ── Cleanup ─────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        terminatedRef.current = true; // prevent any further re-requests
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => { });
        }
        setState((s) => ({ ...s, cameraStream: null, isFullscreen: false, ready: false, showWarning: false }));
    }, []);

    // ── Event listeners (only when enabled + ready) ─────────────
    useEffect(() => {
        if (!enabled || !state.ready) return;

        // Tab switch / visibility change
        const handleVisibilityChange = () => {
            if (!document.hidden) return; // only count when leaving
            if (terminatedRef.current) return; // already terminated — ignore

            // Debounce rapid visibility toggles
            if (debounceRef.current) return;
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
            }, 200);

            switchCountRef.current += 1;
            const count = switchCountRef.current;

            if (count >= maxTabSwitches) {
                terminatedRef.current = true; // lock — no more counting
                setState((s) => ({
                    ...s,
                    tabSwitchCount: count,
                    showWarning: true,
                    warningMessage: `You have switched tabs ${count} times. Your quiz has been terminated.`,
                    terminated: true,
                }));
                // Delay terminate slightly so warning renders, then auto-dismiss
                setTimeout(() => {
                    terminateRef.current();
                }, 1500);
            } else {
                setState((s) => ({
                    ...s,
                    tabSwitchCount: count,
                    showWarning: true,
                    warningMessage: `Warning: Tab switch detected (${count}/${maxTabSwitches}). One more will terminate your quiz.`,
                }));
            }
        };

        // Copy / cut prevention
        const preventCopy = (e: Event) => {
            e.preventDefault();
        };

        // Fullscreen change — re-request if exited during quiz
        const handleFullscreenChange = () => {
            if (terminatedRef.current) return; // don't re-request after termination
            const inFs = !!document.fullscreenElement;
            setState((s) => ({ ...s, isFullscreen: inFs }));
            if (!inFs) {
                // Re-request after a brief delay
                setTimeout(() => {
                    if (!terminatedRef.current) requestFullscreen();
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
    }, [enabled, state.ready, maxTabSwitches, requestFullscreen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    return {
        ...state,
        requestFullscreen,
        requestCamera,
        dismissWarning,
        markReady,
        cleanup,
    };
}
