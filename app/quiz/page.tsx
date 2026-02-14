'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useAuthStore } from '@/store';
import { motion } from 'framer-motion';
import { Settings, Play, Clock, BarChart } from 'lucide-react';

function QuizConfigContent() {
  const searchParams = useSearchParams();
  const skillId = searchParams.get('skillId');
  const { user } = useAuthStore();
  const router = useRouter();

  const [config, setConfig] = useState({
    questionCount: 10,
    difficulty: 'medium',
    mode: 'timed'
  });
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          skillId,
          ...config
        })
      });
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/quiz/${data.sessionId}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px' }}>
      <Navbar />
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card" 
          style={{ padding: '3rem' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px', 
              background: 'rgba(99, 102, 241, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Settings size={32} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Quiz Configuration</h1>
            <p style={{ color: '#a5b4fc', marginTop: '0.5rem' }}>Customize your practice session</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', color: '#a5b4fc' }}>
                Number of Questions
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[5, 10, 15, 20].map(count => (
                  <button
                    key={count}
                    onClick={() => setConfig({...config, questionCount: count})}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: config.questionCount === count ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      background: config.questionCount === count ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', color: '#a5b4fc' }}>
                Difficulty Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {['easy', 'medium', 'hard'].map(level => (
                  <button
                    key={level}
                    onClick={() => setConfig({...config, difficulty: level})}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: config.difficulty === level ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      background: config.difficulty === level ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleStart}
              disabled={loading}
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.1rem' }}
            >
              {loading ? 'Preparing Quiz...' : 'Start Quiz Session'} <Play size={20} fill="white" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function QuizConfigPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Loading...</div>}>
      <QuizConfigContent />
    </Suspense>
  );
}
