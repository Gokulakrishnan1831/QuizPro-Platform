'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  BarChart3,
  IndianRupee,
  TrendingUp,
  Activity,
  Clock,
  Target,
  Zap,
  Crown,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface Stats {
  totalUsers: number;
  totalQuestions: number;
  totalAttempts: number;
  estimatedRevenue: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  persona: string | null;
  subscriptionTier: string;
  quizzesRemaining: number;
  createdAt: string;
}

interface TierBreakdown {
  subscriptionTier: string;
  _count: { id: number };
}

/* ─── Helpers ────────────────────────────────────────────────── */

const TIER_COLOR: Record<string, string> = {
  FREE: '#6b7280',
  BASIC: '#06b6d4',
  PRO: '#6366f1',
  ELITE: '#f59e0b',
};

const TIER_ICON: Record<string, string> = {
  FREE: '🎯',
  BASIC: '📚',
  PRO: '🚀',
  ELITE: '👑',
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [tierBreakdown, setTierBreakdown] = useState<TierBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        setRecentUsers(d.recentUsers ?? []);
        setTierBreakdown(d.tierBreakdown ?? []);
      })
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
          color: '#6b7280',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Zap size={32} color="#6366f1" style={{ animation: 'pulse 1.5s infinite' }} />
        Loading dashboard...
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: <Users size={24} color="#6366f1" />,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.08)',
    },
    {
      label: 'Quiz Attempts',
      value: stats?.totalAttempts ?? 0,
      icon: <Activity size={24} color="#06b6d4" />,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.08)',
    },
    {
      label: 'Question Bank',
      value: stats?.totalQuestions ?? 0,
      icon: <BookOpen size={24} color="#10b981" />,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
    },
    {
      label: 'Est. Revenue',
      value: `₹${(stats?.estimatedRevenue ?? 0).toLocaleString('en-IN')}`,
      icon: <IndianRupee size={24} color="#f59e0b" />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
    },
  ];

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          Admin Overview
        </h1>
        <p style={{ color: '#a5b4fc', fontSize: '0.95rem' }}>
          Platform health at a glance — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card"
            style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: card.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${card.color}20`,
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'white' }}>
                {card.value.toLocaleString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Recent Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="glass-card"
          style={{ padding: '1.75rem', overflow: 'hidden' }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Users size={18} color="#a5b4fc" /> Recent Sign-ups
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['User', 'Persona', 'Tier', 'Quizzes Left', 'Joined'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        color: '#6b7280',
                        fontWeight: '600',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}
                    >
                      No users yet
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '600', color: 'white' }}>
                          {u.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {u.email}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#a5b4fc' }}>
                        {u.persona ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            background: `${TIER_COLOR[u.subscriptionTier] ?? '#6b7280'}18`,
                            color: TIER_COLOR[u.subscriptionTier] ?? '#6b7280',
                            border: `1px solid ${TIER_COLOR[u.subscriptionTier] ?? '#6b7280'}30`,
                          }}
                        >
                          {TIER_ICON[u.subscriptionTier]} {u.subscriptionTier}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'center',
                          color: u.quizzesRemaining === 0 ? '#ef4444' : '#10b981',
                          fontWeight: '700',
                        }}
                      >
                        {u.quizzesRemaining}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '0.78rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Tier Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
          style={{ padding: '1.75rem' }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Crown size={18} color="#f59e0b" /> Subscription Mix
          </h2>

          {tierBreakdown.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No data yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {([...tierBreakdown] as any[])
                .sort((a, b) => b._count.id - a._count.id)
                .map((t) => {
                  const total = tierBreakdown.reduce(
                    (s: number, x: any) => s + (x._count?.id ?? 0),
                    0
                  );
                  const pct =
                    total > 0
                      ? Math.round(((t._count?.id ?? 0) / total) * 100)
                      : 0;
                  const color = TIER_COLOR[t.subscriptionTier] ?? '#6b7280';

                  return (
                    <div key={t.subscriptionTier}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span style={{ fontWeight: '600' }}>
                          {TIER_ICON[t.subscriptionTier]}{' '}
                          {t.subscriptionTier}
                        </span>
                        <span style={{ color: '#6b7280' }}>
                          {t._count?.id ?? 0} users ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.06)',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                          style={{
                            height: '100%',
                            background: color,
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
