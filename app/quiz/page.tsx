'use client';

import { Suspense, useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Zap,
  Loader2,
  AlertCircle,
  BookOpen,
  Target,
  Clock,
  ToggleLeft,
  ToggleRight,
  Code2,
  Building2,
  FileText,
  Info,
  Lock,
} from 'lucide-react';
import { generateQuiz } from '@/app/actions/generateQuiz';
import { usePlan } from '@/components/upgrade/PlanProvider';
import { isFeatureLocked } from '@/lib/plans';

const SKILLS = [
  { id: 'SQL', name: 'SQL', color: '#6366f1', icon: '🗄️' },
  { id: 'EXCEL', name: 'Excel', color: '#10b981', icon: '📊' },
  { id: 'POWERBI', name: 'Power BI', color: '#06b6d4', icon: '📈' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

function QuizConfigContent() {
  const searchParams = useSearchParams();
  const preselectedSkill = searchParams.get('skill');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { currentTier, openUpgradeDialog } = usePlan();

  // Feature locks
  const interviewPrepLocked = isFeatureLocked(currentTier, 'PRO');
  const handsOnLocked = false;

  const [config, setConfig] = useState({
    questionCount: 10,
    selectedSkill: preselectedSkill || 'SQL',
    includeHandsOn: false,
    quizGoal: 'PRACTICE' as 'PRACTICE' | 'INTERVIEW_PREP',
    company: '',
    jdText: '',
    interviewDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const powerBiOnly = config.selectedSkill === 'POWERBI';

  useEffect(() => {
    if (preselectedSkill) {
      setConfig((prev) => ({
        ...prev,
        selectedSkill: preselectedSkill,
        includeHandsOn: preselectedSkill === 'POWERBI' ? false : prev.includeHandsOn,
      }));
    }
  }, [preselectedSkill]);

  const handleStart = () => {
    setLoading(true);
    setError('');

    startTransition(async () => {
      try {
        const result = await generateQuiz({
          skills: [config.selectedSkill] as any,
          questionCount: config.questionCount,
          includeHandsOn: powerBiOnly ? false : config.includeHandsOn,
          quizGoal: config.quizGoal,
          jdCompany: config.quizGoal === 'INTERVIEW_PREP' ? config.company : undefined,
          jdText: config.quizGoal === 'INTERVIEW_PREP' ? config.jdText : undefined,
        });

        if (!result.success) {
          setError(result.error || 'Failed to start quiz');
          setLoading(false);
          return;
        }

        // Store questions in sessionStorage
        if (result.questions) {
          sessionStorage.setItem(
            `quiz-data-${result.quizId}`,
            JSON.stringify({
              id: result.quizId,
              questions: result.questions,
              totalQuestions: result.questions.length,
              timerMins: result.timerMins ?? Math.max(5, result.questions.length * 2),
            })
          );
        }

        router.push(`/quiz/${result.quizId}`);
      } catch {
        setError('Network error. Please try again.');
        setLoading(false);
      }
    });
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Navbar />
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '2.5rem' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <Settings size={32} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Configure Your Quiz
            </h1>
            <p style={{ color: 'var(--text-accent)', fontSize: '0.95rem' }}>
              Select a skill, mode, and let AI generate your practice session
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                color: '#ef4444', marginBottom: '1.5rem', padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px',
                fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.15)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ── Quiz Goal ── */}
            <div>
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginBottom: '1rem', fontWeight: '600', color: 'var(--text-accent)', fontSize: '0.9rem',
                }}
              >
                <Target size={16} /> Quiz Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfig({ ...config, quizGoal: 'PRACTICE' })}
                  style={{
                    padding: '16px 14px', borderRadius: '12px', border: '1px solid',
                    borderColor: config.quizGoal === 'PRACTICE' ? '#10b981' : 'var(--border-color)',
                    background: config.quizGoal === 'PRACTICE' ? 'rgba(16,185,129,0.08)' : 'var(--subtle-bg)',
                    color: config.quizGoal === 'PRACTICE' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <BookOpen size={20} style={{ margin: '0 auto 6px', display: 'block' }} color={config.quizGoal === 'PRACTICE' ? '#10b981' : '#6b7280'} />
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Practice</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Skill building</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (interviewPrepLocked) {
                      openUpgradeDialog('Interview Prep Mode');
                      return;
                    }
                    setConfig({ ...config, quizGoal: 'INTERVIEW_PREP' });
                  }}
                  style={{
                    padding: '16px 14px', borderRadius: '12px', border: '1px solid',
                    borderColor: interviewPrepLocked ? 'var(--border-color)' : config.quizGoal === 'INTERVIEW_PREP' ? '#f59e0b' : 'var(--border-color)',
                    background: interviewPrepLocked ? 'var(--subtle-bg)' : config.quizGoal === 'INTERVIEW_PREP' ? 'rgba(245,158,11,0.08)' : 'var(--subtle-bg)',
                    color: interviewPrepLocked ? 'var(--text-muted)' : config.quizGoal === 'INTERVIEW_PREP' ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: interviewPrepLocked ? 'pointer' : 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    opacity: interviewPrepLocked ? 0.75 : 1,
                  }}
                >
                  <Building2 size={20} style={{ margin: '0 auto 6px', display: 'block' }} color={!interviewPrepLocked && config.quizGoal === 'INTERVIEW_PREP' ? '#f59e0b' : '#6b7280'} />
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Interview Prep
                    {interviewPrepLocked && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 7px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', fontSize: '0.62rem', color: '#818cf8', fontWeight: '800' }}>
                        <Lock size={9} /> PRO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Company-specific</div>
                </motion.button>
              </div>
            </div>

            {/* ── Interview Prep Fields (conditional) ── */}
            <AnimatePresence>
              {config.quizGoal === 'INTERVIEW_PREP' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      padding: '1.25rem', borderRadius: '14px',
                      background: 'rgba(245,158,11,0.04)',
                      border: '1px solid rgba(245,158,11,0.12)',
                      display: 'flex', flexDirection: 'column', gap: '1rem',
                    }}
                  >
                    <div>
                      <label style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        <Building2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Company Name *
                      </label>
                      <input
                        className="input-field"
                        placeholder="e.g. Google, Flipkart, TCS"
                        value={config.company}
                        onChange={(e) => setConfig({ ...config, company: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                        <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Job Description *
                      </label>
                      <textarea
                        className="input-field"
                        rows={3}
                        placeholder="Paste the JD — AI will analyze it to generate interview-specific questions"
                        style={{ resize: 'vertical' }}
                        value={config.jdText}
                        onChange={(e) => setConfig({ ...config, jdText: e.target.value })}
                      />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      AI will generate questions based on the interview patterns of this company — drawing from Glassdoor, AmbitionBox, and LinkedIn interview experiences.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            {/* ── Question count ── */}
            <div>
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginBottom: '1rem', fontWeight: '600', color: 'var(--text-accent)', fontSize: '0.9rem',
                }}
              >
                <Target size={16} /> Number of Questions
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {QUESTION_COUNTS.map((count) => {
                  const isSelected = config.questionCount === count;
                  return (
                    <motion.button
                      key={count}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setConfig({ ...config, questionCount: count })}
                      style={{
                        padding: '14px', borderRadius: '12px', border: '1px solid',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--subtle-bg)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', fontSize: '1.1rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      {count}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Hands-On Toggle ── */}
            <div>
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginBottom: '1rem', fontWeight: '600', color: 'var(--text-accent)', fontSize: '0.9rem',
                }}
              >
                <Code2 size={16} /> Question Mode
              </label>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  if (powerBiOnly) return;
                  if (handsOnLocked) {
                    openUpgradeDialog('Hands-On SQL & Excel Questions');
                    return;
                  }
                  setConfig((prev) => ({ ...prev, includeHandsOn: !prev.includeHandsOn }));
                }}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid',
                  borderColor: !handsOnLocked && config.includeHandsOn && !powerBiOnly ? 'var(--primary)' : 'var(--border-color)',
                  background: !handsOnLocked && config.includeHandsOn && !powerBiOnly ? 'rgba(99, 102, 241, 0.1)' : 'var(--subtle-bg)',
                  color: !handsOnLocked && config.includeHandsOn && !powerBiOnly ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: powerBiOnly ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', textAlign: 'left', fontSize: '0.9rem',
                  opacity: powerBiOnly || handsOnLocked ? 0.7 : 1,
                }}
              >
                {!handsOnLocked && config.includeHandsOn && !powerBiOnly
                  ? <ToggleRight size={24} color="var(--primary)" />
                  : handsOnLocked
                    ? <Lock size={20} color="#6366f1" />
                    : <ToggleLeft size={24} color="#4b5563" />
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    Include Hands-On Questions
                    {handsOnLocked && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 7px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', fontSize: '0.62rem', color: '#818cf8', fontWeight: '800' }}>
                        <Lock size={9} /> PRO
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {handsOnLocked
                      ? 'Upgrade to Pro to unlock SQL editor & Excel grid questions'
                      : powerBiOnly
                        ? 'Power BI supports MCQ + Fill in the Blank only'
                        : config.includeHandsOn
                          ? 'SQL editor, Excel grid mixed in'
                          : 'MCQ only — multiple choice questions'}
                  </div>
                </div>
              </motion.button>
            </div>

            {/* ── Timer Info ── */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '14px 16px', borderRadius: '12px',
                background: 'var(--subtle-bg)', border: '1px solid var(--border-color)',
                color: 'var(--text-muted)', fontSize: '0.85rem',
              }}
            >
              <Clock size={18} />
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  Timer: {(() => {
                    const raw = (config.includeHandsOn && !powerBiOnly)
                      ? config.questionCount * 2.5
                      : config.questionCount * 1.5;
                    return Math.max(5, Math.min(20, Math.ceil(raw / 5) * 5));
                  })()} minutes
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                  Auto-submits when timer ends · Rounded to 5-min intervals
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-accent)', fontSize: '0.8rem', fontWeight: '600' }}>
                {config.selectedSkill}
                {config.includeHandsOn && !powerBiOnly && ' · Hands-On'}
              </span>
            </div>

            {/* ── Start Button ── */}
            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              onClick={handleStart}
              disabled={loading || isPending || (config.quizGoal === 'INTERVIEW_PREP' && (!config.company || !config.jdText))}
              className="btn-primary"
              style={{
                width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.1rem',
                opacity: (loading || (config.quizGoal === 'INTERVIEW_PREP' && (!config.company || !config.jdText))) ? 0.6 : 1,
                gap: '10px',
              }}
            >
              {loading || isPending ? (
                <>
                  <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                  {config.quizGoal === 'INTERVIEW_PREP'
                    ? 'Generating Interview Questions...'
                    : 'Creating your Preplytics quiz session...'}
                </>
              ) : (
                <>
                  <Zap size={22} fill="white" />
                  {config.quizGoal === 'INTERVIEW_PREP'
                    ? 'Start Interview Prep'
                    : 'Start AI Quiz'}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function QuizConfigPage() {
  return (
    <Suspense
      fallback={
        <div style={{ color: 'var(--text-primary)', padding: '100px', textAlign: 'center' }}>
          Loading...
        </div>
      }
    >
      <QuizConfigContent />
    </Suspense>
  );
}
