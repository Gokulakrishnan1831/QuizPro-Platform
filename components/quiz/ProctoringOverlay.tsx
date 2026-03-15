'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  Copy,
  Eye,
  Loader2,
  Maximize,
  MonitorX,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { FaceStatus } from '@/lib/proctoring/faceMonitor';

interface ProctoringGateProps {
  onReady: () => void;
  requestCamera: () => Promise<boolean>;
  requestFullscreen: () => Promise<boolean | void>;
  runStartFaceCheck: (videoEl: HTMLVideoElement) => Promise<boolean>;
  cameraStream: MediaStream | null;
  cameraError: string | null;
  faceStatus: FaceStatus;
}

interface WarningDialogProps {
  show: boolean;
  message: string;
  terminated: boolean;
  onDismiss: () => void;
}

export function ProctoringGate({
  onReady,
  requestCamera,
  requestFullscreen,
  runStartFaceCheck,
  cameraStream,
  cameraError,
  faceStatus,
}: ProctoringGateProps) {
  const [loading, setLoading] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraGranted = Boolean(cameraStream);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const exitFullscreenIfActive = async () => {
    const fullscreenDocument = document as Document & {
      webkitFullscreenElement?: Element | null;
      msFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    const activeFullscreenElement =
      document.fullscreenElement ??
      fullscreenDocument.webkitFullscreenElement ??
      fullscreenDocument.msFullscreenElement ??
      null;

    if (!activeFullscreenElement) return;

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (fullscreenDocument.webkitExitFullscreen) {
        await fullscreenDocument.webkitExitFullscreen();
      } else if (fullscreenDocument.msExitFullscreen) {
        await fullscreenDocument.msExitFullscreen();
      }
    } catch {
      // Ignore exit failures and keep the visible retry error instead.
    }
  };

  const waitForPreview = async () => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 1500) {
      const videoEl = videoRef.current;
      if (videoEl?.srcObject) return videoEl;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    return null;
  };

  const handleStart = async () => {
    setLoading(true);
    setFaceVerified(false);
    setStartError(null);

    const fullscreenGranted = await requestFullscreen();
    if (fullscreenGranted === false) {
      setStartError('Fullscreen could not be enabled. Allow fullscreen and try again.');
      setLoading(false);
      return;
    }

    if (!cameraGranted) {
      const ok = await requestCamera();
      if (!ok) {
        await exitFullscreenIfActive();
        setLoading(false);
        return;
      }
    }

    const videoEl = await waitForPreview();
    if (!videoEl) {
      await exitFullscreenIfActive();
      setStartError('Camera preview did not initialize. Please try again.');
      setLoading(false);
      return;
    }

    const verified = await runStartFaceCheck(videoEl);
    setFaceVerified(verified);
    if (!verified) {
      await exitFullscreenIfActive();
      setLoading(false);
      return;
    }

    setLoading(false);
    onReady();
  };

  const rules = [
    { icon: Camera, text: 'Camera stays on during test', color: '#6366f1' },
    { icon: UserCheck, text: 'Face must be detected at start', color: '#10b981' },
    { icon: MonitorX, text: 'Camera off / face away warned once, then terminate', color: '#ef4444' },
    { icon: Maximize, text: 'Exiting fullscreen is warned once, then terminate', color: '#14b8a6' },
    { icon: Copy, text: 'Copy, paste, cut, select-all, print, and save shortcuts are blocked', color: '#f59e0b' },
  ];

  const faceStatusText =
    faceStatus === 'ok'
      ? 'Face detected'
      : faceStatus === 'face_away'
        ? 'Face detected, look directly at camera'
        : faceStatus === 'no_face'
          ? 'No face detected'
          : 'Face check unavailable';

  const faceStatusColor =
    faceStatus === 'ok'
      ? '#10b981'
      : faceStatus === 'error'
        ? '#ef4444'
        : '#f59e0b';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          maxWidth: '540px',
          width: '90%',
          borderRadius: '20px',
          background: 'linear-gradient(145deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))',
          border: '1px solid rgba(99,102,241,0.2)',
          padding: '2.5rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(99,102,241,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <ShieldCheck size={32} color="#6366f1" />
          </div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#f1f5f9',
              marginBottom: '0.5rem',
            }}
          >
            Quiz Proctoring
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Face verification is required before your test starts.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {rules.map((rule, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${rule.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <rule.icon size={18} color={rule.color} />
              </div>
              <span style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>{rule.text}</span>
            </div>
          ))}
        </div>

        {cameraGranted && (
          <div
            style={{
              marginBottom: '1.5rem',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid rgba(16,185,129,0.3)',
              position: 'relative',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block', maxHeight: '180px', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(16,185,129,0.2)',
                fontSize: '0.7rem',
                color: '#10b981',
                fontWeight: '600',
              }}
            >
              <Eye size={10} /> Camera Active
            </div>
          </div>
        )}

        {cameraGranted && (
          <div
            data-testid="proctor-face-status"
            style={{
              marginBottom: '1rem',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(148,163,184,0.08)',
              border: `1px solid ${faceStatusColor}55`,
              color: faceStatusColor,
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {faceStatusText}
          </div>
        )}

        {(cameraError || startError) && (
          <div
            data-testid="proctor-camera-error"
            style={{
              marginBottom: '1.5rem',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#ef4444',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <XCircle size={16} />
            {cameraError ?? startError}
          </div>
        )}

        {faceVerified && (
          <div
            style={{
              marginBottom: '1rem',
              color: '#10b981',
              fontSize: '0.82rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Face verification complete.
          </div>
        )}

        <motion.button
          data-testid="proctor-start-btn"
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={handleStart}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            fontSize: '1.05rem',
            fontWeight: '700',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Verifying face and starting quiz...
            </>
          ) : (
            <>
              <ShieldCheck size={20} />
              Verify Face & Start Quiz
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

export function TabSwitchWarningDialog({
  show,
  message,
  terminated,
  onDismiss,
}: WarningDialogProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          data-testid="proctor-warning-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              maxWidth: '420px',
              width: '90%',
              borderRadius: '16px',
              background: terminated
                ? 'linear-gradient(145deg, rgba(50,20,20,0.98), rgba(30,10,10,0.98))'
                : 'linear-gradient(145deg, rgba(50,40,20,0.98), rgba(30,25,10,0.98))',
              border: `1px solid ${terminated ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: terminated ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <AlertTriangle size={28} color={terminated ? '#ef4444' : '#f59e0b'} />
            </div>

            <h3
              data-testid="proctor-warning-title"
              style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                color: terminated ? '#ef4444' : '#fbbf24',
                marginBottom: '0.75rem',
              }}
            >
              {terminated ? 'Quiz Terminated' : 'Proctoring Warning'}
            </h3>

            <p
              data-testid="proctor-warning-message"
              style={{
                color: '#94a3b8',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
              }}
            >
              {message}
            </p>

            {!terminated && (
              <motion.button
                data-testid="proctor-warning-dismiss"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDismiss}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(245,158,11,0.15)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                I Understand - Continue
              </motion.button>
            )}

            {terminated && (
              <p data-testid="proctor-terminated-note" style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                Submitting your answers...
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TabSwitchBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span
      data-testid="proctor-tab-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: count >= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
        color: count >= 2 ? '#ef4444' : '#f59e0b',
        fontSize: '0.75rem',
        fontWeight: '700',
      }}
    >
      <AlertTriangle size={12} />
      Tab Switches: {count}
    </span>
  );
}
