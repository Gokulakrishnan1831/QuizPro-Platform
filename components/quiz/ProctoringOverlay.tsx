'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Maximize,
    ShieldCheck,
    AlertTriangle,
    Eye,
    Copy,
    MonitorX,
    Loader2,
    XCircle,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */

interface ProctoringGateProps {
    onReady: () => void;
    requestCamera: () => Promise<boolean>;
    requestFullscreen: () => Promise<void>;
    cameraStream: MediaStream | null;
    cameraError: string | null;
}

interface WarningDialogProps {
    show: boolean;
    message: string;
    terminated: boolean;
    onDismiss: () => void;
}

interface CameraPreviewProps {
    stream: MediaStream | null;
}

/* ─── Pre-Quiz Gate ─────────────────────────────────────────── */

export function ProctoringGate({
    onReady,
    requestCamera,
    requestFullscreen,
    cameraStream,
    cameraError,
}: ProctoringGateProps) {
    const [cameraGranted, setCameraGranted] = useState(false);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
            setCameraGranted(true);
        }
    }, [cameraStream]);

    const handleStart = async () => {
        setLoading(true);

        // Step 1: Request camera
        if (!cameraGranted) {
            const ok = await requestCamera();
            if (!ok) {
                setLoading(false);
                return;
            }
        }

        // Step 2: Request fullscreen
        await requestFullscreen();

        // Step 3: Mark ready
        setLoading(false);
        onReady();
    };

    const rules = [
        { icon: Camera, text: 'Your camera will be turned on for the entire test', color: '#6366f1' },
        { icon: Maximize, text: 'Fullscreen mode will be activated', color: '#10b981' },
        { icon: MonitorX, text: 'Tab switching is monitored — 2nd switch terminates quiz', color: '#ef4444' },
        { icon: Copy, text: 'Copying text is disabled during the test', color: '#f59e0b' },
    ];

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
                    maxWidth: '520px',
                    width: '90%',
                    borderRadius: '20px',
                    background: 'linear-gradient(145deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))',
                    border: '1px solid rgba(99,102,241,0.2)',
                    padding: '2.5rem',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
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
                        Please review the following rules before starting your quiz
                    </p>
                </div>

                {/* Rules */}
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
                                    background: `${rule.color}15`,
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

                {/* Camera Preview */}
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

                {/* Camera Error */}
                {cameraError && (
                    <div
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
                        {cameraError}
                    </div>
                )}

                {/* Start Button */}
                <motion.button
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
                            Setting up proctoring...
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={20} />
                            Accept & Start Quiz
                        </>
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
}

/* ─── Tab Switch Warning Dialog ──────────────────────────────── */

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
                            style={{
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                color: terminated ? '#ef4444' : '#fbbf24',
                                marginBottom: '0.75rem',
                            }}
                        >
                            {terminated ? 'Quiz Terminated' : 'Tab Switch Detected'}
                        </h3>

                        <p
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
                                I Understand — Continue
                            </motion.button>
                        )}

                        {terminated && (
                            <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                Submitting your answers...
                            </p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ─── Camera Preview (small corner video) ────────────────────── */

export function CameraPreview({ stream }: CameraPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 999,
                width: '160px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid rgba(99,102,241,0.3)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    display: 'block',
                    objectFit: 'cover',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 2s ease-in-out infinite',
                }}
            />
        </div>
    );
}

/* ─── Tab Switch Counter Badge ───────────────────────────────── */

export function TabSwitchBadge({ count }: { count: number }) {
    if (count === 0) return null;

    return (
        <span
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
