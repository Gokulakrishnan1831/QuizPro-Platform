'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, MessageCircle } from 'lucide-react';

const CTA_MESSAGES = [
    { text: 'Stuck on SQL? Get personalized mentorship!', emoji: '🗄️' },
    { text: 'Need help with Excel formulas? Talk to a mentor!', emoji: '📊' },
    { text: 'Boost your data career with 1-on-1 guidance!', emoji: '🚀' },
    { text: 'Struggling with Power BI? A mentor can help!', emoji: '📈' },
    { text: 'Want a personalized DA learning roadmap?', emoji: '🗺️' },
];

const MENTORSHIP_URL = 'https://mentorship-platform-ve5o.onrender.com/';

export default function MentorshipCTA() {
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    const showBanner = useCallback(() => {
        setDismissed(false);
        setVisible(true);
        setTimeout(() => setExpanded(true), 400);
    }, []);

    useEffect(() => {
        const initialTimer = setTimeout(showBanner, 15000);
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % CTA_MESSAGES.length);
            showBanner();
        }, 30000);
        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [showBanner]);

    const handleDismiss = () => {
        setExpanded(false);
        setTimeout(() => {
            setVisible(false);
            setDismissed(true);
        }, 300);
    };

    const currentMessage = CTA_MESSAGES[messageIndex];

    return (
        <AnimatePresence>
            {visible && !dismissed && (
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 80, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 100,
                        maxWidth: expanded ? '380px' : '56px',
                        transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {expanded ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                background: 'var(--dropdown-bg)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '20px',
                                padding: '1.25rem 1.5rem',
                                boxShadow: 'var(--shadow-lg)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: 'linear-gradient(90deg, #6366f1, #06b6d4, #10b981, #f59e0b, #6366f1)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 3s linear infinite',
                                }}
                            />

                            <button
                                onClick={handleDismiss}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    background: 'var(--input-bg)',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                                <X size={14} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1rem' }}>
                                <div
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.1))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.4rem',
                                        flexShrink: 0,
                                    }}
                                >
                                    {currentMessage.emoji}
                                </div>
                                <div style={{ paddingRight: '1.5rem' }}>
                                    <div
                                        style={{
                                            fontSize: '0.72rem',
                                            color: '#6366f1',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginBottom: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        <Sparkles size={11} /> Mentorship
                                    </div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: '600', lineHeight: 1.4 }}>
                                        {currentMessage.text}
                                    </div>
                                </div>
                            </div>

                            <a
                                href={MENTORSHIP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '11px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    textDecoration: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(99, 102, 241, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.3)';
                                }}
                            >
                                <MessageCircle size={16} />
                                Connect with a Mentor
                                <ArrowRight size={14} />
                            </a>
                            <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
                        </motion.div>
                    ) : (
                        <motion.button
                            onClick={() => setExpanded(true)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 24px rgba(99, 102, 241, 0.4)',
                                animation: 'pulse-glow 2s ease-in-out infinite',
                            }}
                        >
                            <MessageCircle size={24} />
                            <style>{`
                @keyframes pulse-glow {
                  0%, 100% { box-shadow: 0 4px 24px rgba(99, 102, 241, 0.4); }
                  50% { box-shadow: 0 4px 32px rgba(99, 102, 241, 0.7); }
                }
              `}</style>
                        </motion.button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
