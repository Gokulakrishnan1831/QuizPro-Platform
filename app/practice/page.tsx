'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Target, 
  Zap, 
  Trophy, 
  ArrowRight, 
  Clock,
  BarChart2
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/dashboard?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        });
    }
  }, [user?.id]);

  if (loading) return <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Loading Dashboard...</div>;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '50px' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Welcome Header */}
        <header style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            Welcome back, <span className="text-gradient">{user?.name}</span>!
          </h1>
          <p style={{ color: '#a5b4fc', fontSize: '1.1rem' }}>
            You're on a {stats?.streak} day streak. Keep it up! 🔥
          </p>
        </header>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <StatCard icon={<Zap size={24} color="#6366f1" />} label="Questions Practiced" value={stats?.totalQuestions || 0} />
          <StatCard icon={<Flame size={24} color="#f59e0b" />} label="Current Streak" value={`${stats?.streak || 0} Days`} />
          <StatCard icon={<Target size={24} color="#10b981" />} label="Overall Accuracy" value={`${stats?.accuracy || 0}%`} />
          <StatCard icon={<Trophy size={24} color="#06b6d4" />} label="Total XP" value={stats?.xp || 0} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Skill Progress */}
          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={24} color="#6366f1" /> Skill Mastery
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats?.skillProgress?.length > 0 ? (
                stats.skillProgress.map((skill: any, i: number) => (
                  <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: '600' }}>{skill.skillName}</span>
                      <span style={{ color: '#a5b4fc' }}>{skill.mastery}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.accuracy}%` }}
                        style={{ height: '100%', background: 'linear-gradient(to right, #6366f1, #06b6d4)' }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{skill.totalAttempted} Questions</span>
                      <span>{skill.accuracy}% Accuracy</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No practice data yet. Start your first quiz!
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity & Quick Actions */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.1))' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Quick Start</h3>
              <p style={{ color: '#a5b4fc', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Ready to level up? Jump into a practice session now.</p>
              <Link href="/practice" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Start Practice <ArrowRight size={18} />
              </Link>
            </div>

            <section>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} color="#a5b4fc" /> Recent Quizzes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.recentSessions?.map((session: any, i: number) => (
                  <div key={i} style={{ 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Quiz Session</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(session.startedAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontWeight: '700', color: session.score >= 70 ? '#10b981' : '#f59e0b' }}>
                      {Math.round(session.score || 0)}%
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '12px', 
        background: 'rgba(255,255,255,0.05)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{value}</div>
      </div>
    </div>
  );
}
