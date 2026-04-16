'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Medal,
    Crown,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Loader2,
    Sparkles,
    Lock,
} from 'lucide-react';
import { usePlan } from '@/components/upgrade/PlanProvider';
import { isFeatureLocked } from '@/lib/plans';

/* ─── Types ──────────────────────────────────────────────────── */

interface LeaderboardEntry {
    rank: number;
    label: string;
    score: number;
    quizzes: number;
    accuracy: number;
    isCurrentUser?: boolean;
}

/* ─── Constants ──────────────────────────────────────────────── */

const SKILL_FILTERS = [
    { id: 'SQL', label: 'SQL', emoji: '🗄️' },
    { id: 'EXCEL', label: 'Excel', emoji: '📊' },
    { id: 'POWERBI', label: 'Power BI', emoji: '📈' },
];

const PROFILE_FILTERS = [
    { id: 'FRESHER', label: 'Freshers', emoji: '🎓' },
    { id: 'EXPERIENCED', label: 'Experienced', emoji: '💼' },
];

/* ─── Helpers ────────────────────────────────────────────────── */

function getRankIcon(rank: number) {
    if (rank === 1)
        return (
            <Crown
                size={22}
                color="#f59e0b"
                fill="#f59e0b"
                style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' }}
            />
        );
    if (rank === 2) return <Medal size={20} color="#94a3b8" />;
    if (rank === 3) return <Medal size={20} color="#cd7f32" />;
    return (
        <span
            style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                width: '22px',
                textAlign: 'center',
            }}
        >
            {rank}
        </span>
    );
}

function getRankBg(rank: number, isCurrentUser?: boolean) {
    if (isCurrentUser)
        return 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))';
    if (rank === 1)
        return 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(245,158,11,0.01))';
    if (rank === 2)
        return 'linear-gradient(135deg, rgba(148,163,184,0.05), rgba(148,163,184,0.01))';
    if (rank === 3)
        return 'linear-gradient(135deg, rgba(205,127,50,0.05), rgba(205,127,50,0.01))';
    return 'transparent';
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [activeFilter, setActiveFilter] = useState('SQL');
    const [profileFilter, setProfileFilter] = useState('FRESHER');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [status, setStatus] = useState<'ok' | 'unavailable'>('ok');
    const [message, setMessage] = useState<string>('');
    const { currentTier, openUpgradeDialog } = usePlan();
    const leaderboardLocked = isFeatureLocked(currentTier, 'BASIC');

    const fetchLeaderboard = useCallback(
        async (skill: string, profileType: string, isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            try {
                const res = await fetch(
                    `/api/leaderboard?skill=${skill}&profileType=${profileType}&limit=25`,
                    { cache: 'no-store' }
                );
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setEntries([]);
                    setStatus('unavailable');
                    setMessage(data?.error ?? 'Leaderboard is unavailable.');
                } else {
                    setEntries(data.entries ?? []);
                    setStatus(data.status === 'unavailable' ? 'unavailable' : 'ok');
                    setMessage(data.message ?? '');
                }
            } catch {
                setEntries([]);
                setStatus('unavailable');
                setMessage('Leaderboard is unavailable.');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchLeaderboard(activeFilter, profileFilter);
    }, [activeFilter, profileFilter, fetchLeaderboard]);

    const currentUserEntry = entries.find((e) => e.isCurrentUser);

    return (
        <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
            <Navbar />

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
                {/* ── Header ────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', marginBottom: '3rem' }}
                >
                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            background:
                                'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            border: '1px solid rgba(245,158,11,0.2)',
                        }}
                    >
                        <Trophy size={40} color="#f59e0b" />
                    </div>
                    <h1
                        style={{
                            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                            fontWeight: '800',
                            marginBottom: '0.75rem',
                        }}
                    >
                        <span className="text-gradient">Leaderboard</span>
                    </h1>
                    <p style={{ color: 'var(--text-accent)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                        Compete with peers at your level — segmented by skill & experience
                    </p>
                </motion.div>

                {/* ── Your rank banner (if logged in & on the board) ── */}
                <AnimatePresence>
                    {!loading && currentUserEntry && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="glass-card"
                            style={{
                                marginBottom: '1.5rem',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background:
                                    'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.05))',
                                border: '1px solid rgba(99,102,241,0.2)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Sparkles size={20} color="#6366f1" />
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                                        Your Current Rank
                                    </div>
                                    <div style={{ color: 'var(--text-accent)', fontSize: '0.82rem' }}>
                                        {currentUserEntry.quizzes} quizzes completed
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: '1.75rem',
                                    fontWeight: '900',
                                    color: '#6366f1',
                                }}
                            >
                                #{currentUserEntry.rank}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Skill filters ─────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        marginBottom: '1.5rem',
                        alignItems: 'center',
                    }}
                >
                    {/* Profile type filter */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {PROFILE_FILTERS.map((pf) => (
                            <button
                                key={pf.id}
                                onClick={() => {
                                    setProfileFilter(pf.id);
                                }}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: profileFilter === pf.id
                                        ? '1px solid rgba(99,102,241,0.6)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    background: profileFilter === pf.id
                                        ? 'rgba(99,102,241,0.12)'
                                        : 'rgba(255,255,255,0.03)',
                                    color: profileFilter === pf.id ? 'var(--text-primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>{pf.emoji}</span> {pf.label}
                            </button>
                        ))}
                    </div>

                    {/* Skill filters */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {SKILL_FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => {
                                    setActiveFilter(filter.id);
                                }}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '20px',
                                    border:
                                        activeFilter === filter.id
                                            ? '1px solid rgba(99,102,241,0.6)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                    background:
                                        activeFilter === filter.id
                                            ? 'rgba(99,102,241,0.12)'
                                            : 'rgba(255,255,255,0.03)',
                                    color: activeFilter === filter.id ? 'var(--text-primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>{filter.emoji}</span>
                                {filter.label}
                            </button>
                        ))}

                        {/* Refresh button */}
                        <button
                            onClick={() => fetchLeaderboard(activeFilter, profileFilter, true)}
                            disabled={refreshing || loading}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--subtle-bg)',
                                color: 'var(--text-muted)',
                                cursor: refreshing ? 'wait' : 'pointer',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                            title="Refresh rankings"
                        >
                            {refreshing ? (
                                <Loader2
                                    size={14}
                                    style={{ animation: 'spin 1s linear infinite' }}
                                />
                            ) : (
                                <RefreshCw size={14} />
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* ── Table ─────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card"
                    style={{ overflow: 'hidden', position: 'relative' }}
                >
                    {/* ── FREE user lock overlay ── */}
                    {leaderboardLocked && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 10,
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                background: 'rgba(5,5,20,0.6)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '14px',
                                borderRadius: 'inherit',
                            }}
                        >
                            <div
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'rgba(6,182,212,0.15)',
                                    border: '2px solid #06b6d4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Lock size={26} color="#06b6d4" />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '6px' }}>
                                    Leaderboard is locked
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '280px', lineHeight: 1.5 }}>
                                    Upgrade to <strong style={{ color: '#06b6d4' }}>Basic</strong> or higher to compete on the leaderboard
                                </p>
                            </div>
                            <button
                                onClick={() => openUpgradeDialog('Leaderboard Access')}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #06b6d4, #06b6d4cc)',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
                                }}
                            >
                                Upgrade Now
                            </button>
                        </div>
                    )}
                    {/* Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '60px 1fr 110px 90px 110px',
                            padding: '14px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '1.2px',
                            fontWeight: '600',
                        }}
                    >
                        <span>Rank</span>
                        <span>Analyst</span>
                        <span style={{ textAlign: 'center' }}>Best Score</span>
                        <span style={{ textAlign: 'center' }}>Quizzes</span>
                        <span style={{ textAlign: 'center' }}>Accuracy</span>
                    </div>

                    {loading ? (
                        <div
                            style={{
                                padding: '5rem',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <Loader2
                                size={28}
                                color="#6366f1"
                                style={{ animation: 'spin 1s linear infinite' }}
                            />
                            Loading rankings...
                        </div>
                    ) : entries.length === 0 ? (
                        <div
                            style={{
                                padding: '5rem 2rem',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <Trophy size={40} color="#374151" style={{ margin: '0 auto 1rem' }} />
                            <p>{status === 'unavailable' ? (message || 'Leaderboard is unavailable right now.') : 'No entries yet. Complete quizzes to appear here!'}</p>
                        </div>
                    ) : (
                        entries.map((entry, i) => (
                            <motion.div
                                key={`${entry.label}-${entry.rank}-${entry.quizzes}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.025 }}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 1fr 110px 90px 110px',
                                    padding: '14px 20px',
                                    alignItems: 'center',
                                    borderBottom:
                                        i < entries.length - 1
                                            ? '1px solid rgba(255,255,255,0.03)'
                                            : 'none',
                                    background: getRankBg(entry.rank, entry.isCurrentUser),
                                    transition: 'background 0.2s',
                                    outline: entry.isCurrentUser
                                        ? '1px solid rgba(99,102,241,0.15)'
                                        : 'none',
                                }}
                            >
                                {/* Rank */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                    }}
                                >
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                        style={{
                                            fontWeight: entry.rank <= 3 || entry.isCurrentUser ? '700' : '500',
                                            fontSize: '0.9rem',
                                            color: entry.isCurrentUser ? '#a5b4fc' : 'white',
                                        }}
                                    >
                                        {entry.label}
                                    </span>
                                    {entry.isCurrentUser && (
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '2px 7px',
                                                borderRadius: '8px',
                                                background: 'rgba(99,102,241,0.12)',
                                                color: '#818cf8',
                                                border: '1px solid rgba(99,102,241,0.2)',
                                                fontWeight: '700',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            YOU
                                        </span>
                                    )}
                                </div>

                                {/* Score */}
                                <div
                                    style={{
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        fontSize: '1.05rem',
                                        color:
                                            entry.score >= 90
                                                ? '#10b981'
                                                : entry.score >= 70
                                                    ? '#f59e0b'
                                                    : '#ef4444',
                                    }}
                                >
                                    {entry.score}%
                                </div>

                                {/* Quizzes */}
                                <div
                                    style={{
                                        textAlign: 'center',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-accent)',
                                        fontWeight: '600',
                                    }}
                                >
                                    {entry.quizzes}
                                </div>

                                {/* Accuracy */}
                                <div style={{ textAlign: 'center' }}>
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background:
                                                entry.accuracy >= 75
                                                    ? 'rgba(16,185,129,0.08)'
                                                    : 'rgba(245,158,11,0.08)',
                                            color: entry.accuracy >= 75 ? '#10b981' : '#f59e0b',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                        }}
                                    >
                                        {entry.accuracy >= 60 ? (
                                            <TrendingUp size={12} />
                                        ) : (
                                            <TrendingDown size={12} />
                                        )}
                                        {entry.accuracy}%
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>

                {/* Footer note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    style={{
                        textAlign: 'center',
                        marginTop: '1.5rem',
                        color: '#4b5563',
                        fontSize: '0.82rem',
                        lineHeight: '1.6',
                    }}
                >
                    Rankings are anonymized. Complete more quizzes to improve your position.{' '}
                    {!currentUserEntry && !loading && (
                        <span>Log in and take a quiz to appear on the board.</span>
                    )}
                </motion.p>
            </main>
        </div>
    );
}
