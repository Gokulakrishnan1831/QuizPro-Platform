'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import DashboardSplash from '@/components/layout/DashboardSplash';
import { motion } from 'framer-motion';
import {
  Flame,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  Clock,
  BarChart2,
  Lock,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePlan } from '@/components/upgrade/PlanProvider';
import { getNextPlan } from '@/lib/plans';

interface DashboardData {
  profile: {
    id: string;
    email: string;
    name: string | null;
    persona: string | null;
    subscriptionTier: string;
    quizzesRemaining: number;
    profilePhotoUrl?: string | null;
    headline?: string | null;
    profileCompletionPct?: number;
  };
  stats: {
    totalAttempted: number;
    totalCorrect: number;
    accuracy: number;
    quizzesTaken: number;
  };
  skillProgress: {
    skill: string;
    totalAttempted: number;
    totalCorrect: number;
    accuracy: number;
    lastPracticed: string;
  }[];
  recentAttempts: {
    id: string;
    score: number;
    timeTaken: number;
    persona: string;
    completedAt: string;
  }[];
}

const REMIND_KEY = 'preplytics_upgrade_remind_until';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentTier, openUpgradeDialog } = usePlan();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-show upgrade banner once per session for FREE/BASIC users
  useEffect(() => {
    if (loading) return;
    if (currentTier !== 'FREE' && currentTier !== 'BASIC') return;
    const remindUntil = sessionStorage.getItem(REMIND_KEY);
    if (remindUntil && Date.now() < Number(remindUntil)) return;
    const timer = setTimeout(() => setShowUpgradeBanner(true), 3000);
    return () => clearTimeout(timer);
  }, [loading, currentTier]);

  const dismissUpgradeBanner = () => {
    sessionStorage.setItem(REMIND_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setShowUpgradeBanner(false);
  };

  if (loading)
    return <DashboardSplash />;

  if (!data?.profile)
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '20px',
          color: 'var(--text-color)'
        }}
      >
        <div 
          className="glass-card" 
          style={{ 
            maxWidth: '450px', 
            width: '100%', 
            padding: '3rem', 
            textAlign: 'center' 
          }}
        >
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem' }}>
            Almost There!
          </h2>
          <p style={{ color: 'var(--text-accent)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: '1.5' }}>
            It looks like you haven't completed your profile setup. Create your account for the first time to access your dashboard.
          </p>
          <Link
            href="/get-started"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '14px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '1.1rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Complete Setup
          </Link>
        </div>
      </div>
    );

  const { profile, stats, skillProgress, recentAttempts } = data;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '50px' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Upgrade Reminder Banner */}
        {showUpgradeBanner && (() => {
          const nextPlan = getNextPlan(currentTier);
          return nextPlan ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-sm:!flex-col max-sm:!items-start max-sm:!gap-3"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${nextPlan.color}12, ${nextPlan.color}06)`,
                border: `1px solid ${nextPlan.color}30`,
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={18} color={nextPlan.color} />
                <span style={{ color: nextPlan.color, fontSize: '0.9rem', fontWeight: '500' }}>
                  You&apos;re on <strong>{currentTier}</strong> — unlock{' '}
                  <strong>{nextPlan.features.find(f => f.available)?.label ?? `${nextPlan.quizzes} quizzes`}</strong> and more with{' '}
                  <strong>{nextPlan.name}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => { setShowUpgradeBanner(false); openUpgradeDialog(); }}
                  style={{
                    padding: '6px 16px', borderRadius: '8px', fontSize: '0.82rem',
                    background: nextPlan.color, color: '#fff', fontWeight: '700',
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Upgrade Now
                </button>
                <button
                  onClick={dismissUpgradeBanner}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  title="Remind me later"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ) : null;
        })()}

        {/* Profile Completion Banner */}
        {(profile.profileCompletionPct ?? 0) < 80 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-sm:!flex-col max-sm:!items-start max-sm:!gap-3"
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.06))',
              border: '1px solid rgba(245,158,11,0.15)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={20} color="#f59e0b" />
              <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: '500' }}>
                Your profile is {profile.profileCompletionPct ?? 0}% complete — add more details to stand out!
              </span>
            </div>
            <Link
              href="/profile"
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem',
                background: '#f59e0b', color: '#0f0f23', fontWeight: '700',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              Complete Profile
            </Link>
          </motion.div>
        )}

        {/* Welcome Header */}
        <header className="max-sm:!flex-col max-sm:!text-center max-sm:!gap-4" style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Avatar */}
          <Link href="/profile" style={{ flexShrink: 0 }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: profile.profilePhotoUrl
                ? `url(${profile.profilePhotoUrl}) center/cover`
                : 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(99,102,241,0.3)',
              fontSize: '1.5rem', fontWeight: '800', color: 'white',
            }}>
              {!profile.profilePhotoUrl && (profile.name ?? 'U').charAt(0).toUpperCase()}
            </div>
          </Link>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.25rem' }}>
              Welcome back,{' '}
              <span className="text-gradient">{profile.name || profile.email}</span>!
            </h1>
            <p style={{ color: 'var(--text-accent)', fontSize: '1.1rem' }}>
              {profile.headline || `${profile.subscriptionTier} plan`} · {profile.quizzesRemaining} quizzes remaining
            </p>
          </div>
        </header>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          <StatCard
            icon={<Zap size={24} color="#6366f1" />}
            label="Questions Practiced"
            value={stats.totalAttempted}
          />
          <StatCard
            icon={<Trophy size={24} color="#06b6d4" />}
            label="Quizzes Taken"
            value={stats.quizzesTaken}
          />
          <StatCard
            icon={<Target size={24} color="#10b981" />}
            label="Overall Accuracy"
            value={`${stats.accuracy}%`}
          />
          <StatCard
            icon={<Flame size={24} color="#f59e0b" />}
            label="Total Correct"
            value={stats.totalCorrect}
          />
        </div>

        <div className="max-lg:!grid-cols-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Skill Progress */}
          <section>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <BarChart2 size={24} color="#6366f1" /> Skill Mastery
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {skillProgress.length > 0 ? (
                skillProgress.map((sp) => {
                  const level = Math.floor(sp.totalCorrect / 10) + 1;
                  const currentXP = sp.totalCorrect % 10;
                  const nextLevelXP = 10;
                  const progressPct = (currentXP / nextLevelXP) * 100;
                  
                  return (
                    <div key={sp.skill} className="glass-card" style={{ padding: '1.5rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                            {sp.skill === 'DATA_ANALYTICS' ? 'Scenario Questions' : sp.skill.replace('_', ' ')}
                          </span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--primary)', 
                            fontWeight: '700', 
                            padding: '3px 8px', 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '12px' 
                          }}>
                            Lvl {level}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-accent)', fontSize: '0.85rem', fontWeight: '600' }}>
                          {currentXP} / {nextLevelXP} XP
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: 'var(--input-bg)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginBottom: '0.75rem'
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          style={{
                            height: '100%',
                            background: 'linear-gradient(to right, #6366f1, #06b6d4)',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span><strong style={{ color: 'var(--text-primary)' }}>{Math.round(sp.accuracy)}%</strong> Accuracy</span>
                        <span><strong style={{ color: 'var(--text-primary)' }}>{sp.totalCorrect}</strong> Lifetime Correct</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  className="glass-card"
                  style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  No practice data yet. Start your first quiz!
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions + Recent Activity */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div
              className="glass-card"
              style={{
                padding: '1.5rem',
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.1))',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
                Quick Start
              </h3>
              <p style={{ color: 'var(--text-accent)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Ready to level up? Jump into a practice session now.
              </p>
              <Link
                href="/practice"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Start Practice <ArrowRight size={18} />
              </Link>
            </div>

            <section>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Clock size={20} color="#a5b4fc" /> Recent Quizzes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentAttempts.length > 0 ? (
                  recentAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                          {attempt.persona} Quiz
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(attempt.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: '700',
                          color: attempt.score >= 70 ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {Math.round(attempt.score)}%
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No quizzes taken yet.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className="glass-card"
      style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--subtle-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-accent)', marginBottom: '0.25rem' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{value}</div>
      </div>
    </div>
  );
}
