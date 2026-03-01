'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import {
  Flame,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  Clock,
  BarChart2,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  profile: {
    id: string;
    email: string;
    name: string | null;
    persona: string | null;
    subscriptionTier: string;
    quizzesRemaining: number;
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>
        Loading Dashboard...
      </div>
    );

  if (!data?.profile)
    return (
      <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>
        Unable to load dashboard. Please{' '}
        <Link href="/login" style={{ color: '#6366f1' }}>
          log in
        </Link>
        .
      </div>
    );

  const { profile, stats, skillProgress, recentAttempts } = data;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '50px' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Welcome Header */}
        <header style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            Welcome back,{' '}
            <span className="text-gradient">{profile.name || profile.email}</span>!
          </h1>
          <p style={{ color: '#a5b4fc', fontSize: '1.1rem' }}>
            {profile.subscriptionTier} plan · {profile.quizzesRemaining} quizzes remaining
          </p>
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

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
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
                skillProgress.map((sp) => (
                  <div key={sp.skill} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                      }}
                    >
                      <span style={{ fontWeight: '600' }}>{sp.skill}</span>
                      <span style={{ color: '#a5b4fc' }}>{sp.accuracy}%</span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sp.accuracy}%` }}
                        style={{
                          height: '100%',
                          background: 'linear-gradient(to right, #6366f1, #06b6d4)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{sp.totalAttempted} Questions</span>
                      <span>{sp.totalCorrect} Correct</span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="glass-card"
                  style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}
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
              <p style={{ color: '#a5b4fc', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                          {attempt.persona} Quiz
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
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
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
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
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '0.25rem' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{value}</div>
      </div>
    </div>
  );
}
