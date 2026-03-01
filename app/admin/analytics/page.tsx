'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    Target,
    Clock,
    Users,
    Zap,
    Loader2,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface AnalyticsData {
    kpis: {
        totalUsers: number;
        totalAttempts: number;
        totalQuestions: number;
        avgScore: number;
        avgTimeSecs: number;
        recentAttemptsCount: number;
    };
    dailyAttempts: { date: string; count: number }[];
    scoreDistribution: { range: string; count: number }[];
    tierBreakdown: { tier: string; count: number }[];
    personaBreakdown: { persona: string; count: number }[];
    skillAccuracy: {
        skill: string;
        avgAccuracy: number;
        totalAttempted: number;
        totalCorrect: number;
    }[];
}

/* ─── Mini Bar Chart ─────────────────────────────────────────── */

function MiniBar({
    label,
    value,
    max,
    color,
    suffix = '',
}: {
    label: string;
    value: number;
    max: number;
    color: string;
    suffix?: string;
}) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ marginBottom: '0.9rem' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.83rem',
                    marginBottom: '5px',
                }}
            >
                <span style={{ color: '#e2e8f0' }}>{label}</span>
                <span style={{ color, fontWeight: '700' }}>
                    {value}
                    {suffix}
                </span>
            </div>
            <div
                style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                }}
            >
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    style={{ height: '100%', background: color, borderRadius: '4px' }}
                />
            </div>
        </div>
    );
}

/* ─── Inline Sparkline (daily attempts) ──────────────────────── */

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
    if (data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    const w = 420;
    const h = 80;
    const pts = data.map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * w;
        const y = h - (d.count / max) * h * 0.85 - 4;
        return `${x},${y}`;
    });

    return (
        <svg
            width="100%"
            viewBox={`0 0 ${w} ${h}`}
            style={{ overflow: 'visible', display: 'block' }}
        >
            <defs>
                <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                </linearGradient>
            </defs>
            {/* Fill area */}
            <polyline
                points={[
                    ...pts,
                    `${w},${h}`,
                    `0,${h}`,
                ].join(' ')}
                fill="url(#spark-fill)"
            />
            {/* Line */}
            <polyline
                points={pts.join(' ')}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {/* Dots */}
            {data.map((d, i) => {
                const x = (i / Math.max(data.length - 1, 1)) * w;
                const y = h - (d.count / max) * h * 0.85 - 4;
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#6366f1"
                        stroke="#0f0f23"
                        strokeWidth="1.5"
                    />
                );
            })}
        </svg>
    );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics')
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '60vh',
                    flexDirection: 'column',
                    gap: '12px',
                    color: '#6b7280',
                }}
            >
                <Loader2
                    size={32}
                    color="#6366f1"
                    style={{ animation: 'spin 1s linear infinite' }}
                />
                Crunching numbers...
            </div>
        );
    }

    const kpis = data?.kpis;
    const maxScore = Math.max(...(data?.scoreDistribution.map((s) => s.count) ?? [1]), 1);
    const maxAccuracy = 100;
    const maxDaily = Math.max(
        ...(data?.dailyAttempts.map((d) => d.count) ?? [1]),
        1
    );

    const SKILL_COLORS: Record<string, string> = {
        SQL: '#06b6d4',
        EXCEL: '#10b981',
        POWERBI: '#6366f1',
    };

    const PERSONA_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b'];
    const TIER_COLORS: Record<string, string> = {
        FREE: '#6b7280',
        BASIC: '#06b6d4',
        PRO: '#6366f1',
        ELITE: '#f59e0b',
    };

    return (
        <div>
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                    Analytics
                </h1>
                <p style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>
                    Last 30 days · {kpis?.recentAttemptsCount ?? 0} quiz attempts analysed
                </p>
            </header>

            {/* KPI Row */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem',
                }}
            >
                {[
                    { label: 'Avg Score', value: `${kpis?.avgScore ?? 0}%`, icon: <Target size={20} color="#10b981" />, color: '#10b981' },
                    { label: 'Avg Time', value: `${Math.round((kpis?.avgTimeSecs ?? 0) / 60)}m`, icon: <Clock size={20} color="#f59e0b" />, color: '#f59e0b' },
                    { label: 'Total Users', value: kpis?.totalUsers ?? 0, icon: <Users size={20} color="#6366f1" />, color: '#6366f1' },
                    { label: 'Total Attempts', value: kpis?.totalAttempts ?? 0, icon: <TrendingUp size={20} color="#06b6d4" />, color: '#06b6d4' },
                    { label: 'Questions', value: kpis?.totalQuestions ?? 0, icon: <Zap size={20} color="#a5b4fc" />, color: '#a5b4fc' },
                ].map((k, i) => (
                    <motion.div
                        key={k.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="glass-card"
                        style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: `${k.color}12`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${k.color}22`,
                            }}
                        >
                            {k.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '3px' }}>
                                {k.label}
                            </div>
                            <div style={{ fontWeight: '900', fontSize: '1.4rem', color: k.color }}>
                                {String(k.value)}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: '1.5rem',
                    marginBottom: '1.5rem',
                }}
            >
                {/* Daily Attempts Sparkline */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="glass-card"
                    style={{ padding: '1.75rem' }}
                >
                    <h2
                        style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <TrendingUp size={18} color="#6366f1" /> Daily Quiz Attempts (30d)
                    </h2>
                    {data?.dailyAttempts.length === 0 ? (
                        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                            No attempts data yet
                        </p>
                    ) : (
                        <>
                            <Sparkline data={data?.dailyAttempts ?? []} />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '8px',
                                    fontSize: '0.7rem',
                                    color: '#4b5563',
                                }}
                            >
                                <span>{data?.dailyAttempts[0]?.date?.slice(5)}</span>
                                <span>
                                    {data?.dailyAttempts[
                                        (data?.dailyAttempts.length ?? 1) - 1
                                    ]?.date?.slice(5)}
                                </span>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Score Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42 }}
                    className="glass-card"
                    style={{ padding: '1.75rem' }}
                >
                    <h2
                        style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <BarChart3 size={18} color="#06b6d4" /> Score Distribution
                    </h2>
                    {data?.scoreDistribution.map((s) => (
                        <MiniBar
                            key={s.range}
                            label={s.range}
                            value={s.count}
                            max={maxScore}
                            color={
                                parseInt(s.range) >= 80
                                    ? '#10b981'
                                    : parseInt(s.range) >= 50
                                        ? '#f59e0b'
                                        : '#ef4444'
                            }
                        />
                    ))}
                </motion.div>
            </div>

            {/* Charts Row 2 */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
                }}
            >
                {/* Skill Accuracy */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card"
                    style={{ padding: '1.75rem' }}
                >
                    <h2
                        style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            marginBottom: '1.25rem',
                        }}
                    >
                        🎯 Skill Accuracy
                    </h2>
                    {(data?.skillAccuracy ?? []).length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No progress data yet</p>
                    ) : (
                        data?.skillAccuracy.map((s) => (
                            <MiniBar
                                key={s.skill}
                                label={s.skill}
                                value={s.avgAccuracy}
                                max={maxAccuracy}
                                color={SKILL_COLORS[s.skill] ?? '#a5b4fc'}
                                suffix="%"
                            />
                        ))
                    )}
                </motion.div>

                {/* Persona breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.57 }}
                    className="glass-card"
                    style={{ padding: '1.75rem' }}
                >
                    <h2
                        style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            marginBottom: '1.25rem',
                        }}
                    >
                        👤 User Personas
                    </h2>
                    {(data?.personaBreakdown ?? []).length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No data yet</p>
                    ) : (
                        data?.personaBreakdown.map((p, i) => {
                            const maxP = Math.max(
                                ...(data?.personaBreakdown.map((x) => x.count) ?? [1]),
                                1
                            );
                            return (
                                <MiniBar
                                    key={p.persona}
                                    label={p.persona ?? '—'}
                                    value={p.count}
                                    max={maxP}
                                    color={PERSONA_COLORS[i % PERSONA_COLORS.length]}
                                />
                            );
                        })
                    )}
                </motion.div>

                {/* Tier breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.64 }}
                    className="glass-card"
                    style={{ padding: '1.75rem' }}
                >
                    <h2
                        style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            marginBottom: '1.25rem',
                        }}
                    >
                        💳 Subscription Tiers
                    </h2>
                    {(data?.tierBreakdown ?? []).length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No data yet</p>
                    ) : (
                        data?.tierBreakdown.map((t) => {
                            const maxT = Math.max(
                                ...(data?.tierBreakdown.map((x) => x.count) ?? [1]),
                                1
                            );
                            return (
                                <MiniBar
                                    key={t.tier}
                                    label={t.tier}
                                    value={t.count}
                                    max={maxT}
                                    color={TIER_COLORS[t.tier] ?? '#6b7280'}
                                />
                            );
                        })
                    )}
                </motion.div>
            </div>
        </div>
    );
}
