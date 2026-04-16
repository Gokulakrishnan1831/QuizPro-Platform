'use client';

import { useEffect, useState, use } from 'react';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  BarChart3,
  Repeat,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────── */

interface GradedAnswer {
  questionIndex: number;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  solution: string;
  content: string;
  skill: string;
  type: string;
  confidence?: number;
  scenario?: string;
  // Scenario subjective fields
  accuracyScore?: number;
  feedback?: string;
  keyPointsCovered?: string[];
  keyPointsMissed?: string[];
}

interface QuizResults {
  attemptId: string | null;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  aiSummary: string | null;
  focusTopics?: string[];
  wrongCount: number;
  gradedAnswers?: GradedAnswer[];
}

/* ─── Score Ring ─────────────────────────────────────────────── */

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="10"
      />
      <motion.circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        transform="rotate(-90 70 70)"
      />
      <text
        x="70"
        y="65"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="28"
        fontWeight="900"
      >
        {Math.round(score)}%
      </text>
      <text
        x="70"
        y="85"
        textAnchor="middle"
        fill="#6b7280"
        fontSize="11"
      >
        Score
      </text>
    </svg>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function ResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz-results-${sessionId}`);
    if (stored) {
      setResults(JSON.parse(stored));
    }
  }, [sessionId]);

  if (!results) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <Navbar />
        <div
          style={{
            color: 'var(--text-primary)',
            padding: '100px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Results not found.
          </p>
          <Link
            href="/dashboard"
            className="btn-primary"
            style={{ display: 'inline-flex' }}
          >
            Go to Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  const scoreColor =
    results.score >= 80
      ? '#10b981'
      : results.score >= 50
        ? '#f59e0b'
        : '#ef4444';
  const scoreLabel =
    results.score >= 90
      ? 'Outstanding!'
      : results.score >= 80
        ? 'Excellent!'
        : results.score >= 60
          ? 'Good Effort!'
          : results.score >= 40
            ? 'Room to Grow'
            : 'Keep Practicing!';
  const TrendIcon =
    results.score >= 80
      ? TrendingUp
      : results.score >= 50
        ? Minus
        : TrendingDown;

  return (
    <div
      style={{
        minHeight: '100vh',
        paddingTop: '100px',
        paddingBottom: '80px',
      }}
    >
      <Navbar />

      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '0 20px' }}>
        {/* ── Score Hero ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{
            padding: '3rem 2.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            background: `linear-gradient(135deg, ${scoreColor}08, rgba(99, 102, 241, 0.03))`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: `${scoreColor}10`,
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              position: 'relative',
            }}
          >
            <ScoreRing score={results.score} color={scoreColor} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <TrendIcon size={22} color={scoreColor} />
            <p
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: scoreColor,
              }}
            >
              {scoreLabel}
            </p>
          </div>

          {/* Stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginTop: '2rem',
            }}
          >
            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.1)',
              }}
            >
              <CheckCircle2
                size={22}
                color="#10b981"
                style={{ margin: '0 auto 0.5rem' }}
              />
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#10b981',
                }}
              >
                {results.totalCorrect}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Correct
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.1)',
              }}
            >
              <XCircle
                size={22}
                color="#ef4444"
                style={{ margin: '0 auto 0.5rem' }}
              />
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#ef4444',
                }}
              >
                {results.wrongCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Wrong
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
              }}
            >
              <Target
                size={22}
                color="#6366f1"
                style={{ margin: '0 auto 0.5rem' }}
              />
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#6366f1',
                }}
              >
                {results.totalQuestions}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── AI Summary ───────────────────────────────────── */}
        {results.aiSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card"
            style={{ padding: '2rem', marginBottom: '1.5rem' }}
          >
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Sparkles size={20} color="#6366f1" />
              Preplytics Analysis
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.8',
                fontSize: '0.92rem',
                whiteSpace: 'pre-line',
              }}
            >
              {results.aiSummary}
            </p>
          </motion.div>
        )}

        {/* ── Answer Review ─────────────────────────────────── */}
        {results.gradedAnswers && results.gradedAnswers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card"
            style={{ padding: '2rem', marginBottom: '1.5rem' }}
          >
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: '700',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <BookOpen size={20} color="var(--text-accent)" />
              Answer Review
              <span
                style={{
                  marginLeft: '8px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  fontWeight: '400',
                }}
              >
                {results.totalCorrect} / {results.totalQuestions} correct
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[...results.gradedAnswers]
                .sort((a, b) => (a.isCorrect ? 1 : 0) - (b.isCorrect ? 1 : 0))
                .map((ga, i) => {
                  const isOpen = openIndex === i;
                  return (
                    <div
                      key={i}
                      style={{
                        borderRadius: '12px',
                        border: ga.isCorrect
                          ? '1px solid rgba(16,185,129,0.15)'
                          : '1px solid rgba(239,68,68,0.15)',
                        background: ga.isCorrect
                          ? 'rgba(16,185,129,0.03)'
                          : 'rgba(239,68,68,0.03)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Question header — always visible */}
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : i)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          textAlign: 'left',
                        }}
                      >
                        {ga.isCorrect ? (
                          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                        )}
                        <span
                          style={{
                            flex: 1,
                            fontSize: '0.88rem',
                            color: 'var(--text-primary)',
                            lineHeight: '1.4',
                          }}
                        >
                          {ga.content.length > 120
                            ? ga.content.slice(0, 120) + '…'
                            : ga.content}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.04)',
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          {ga.skill}
                        </span>
                        {isOpen ? (
                          <ChevronUp size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        ) : (
                          <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        )}
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div
                          style={{
                            padding: '0 16px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.04)',
                            marginTop: '0',
                          }}
                        >
                          <div
                            style={{
                              marginTop: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            {/* Full question */}
                            <p
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-primary)',
                                lineHeight: '1.6',
                              }}
                            >
                              {ga.content}
                            </p>

                            {/* Your answer */}
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: ga.isCorrect
                                  ? 'rgba(16,185,129,0.06)'
                                  : 'rgba(239,68,68,0.06)',
                                border: ga.isCorrect
                                  ? '1px solid rgba(16,185,129,0.1)'
                                  : '1px solid rgba(239,68,68,0.1)',
                                fontSize: '0.82rem',
                              }}
                            >
                              <span style={{ color: 'var(--text-muted)' }}>Your answer: </span>
                              <span
                                style={{
                                  color: ga.isCorrect ? '#10b981' : '#ef4444',
                                  fontWeight: '600',
                                }}
                              >
                                {ga.userAnswer || '(no answer)'}
                              </span>
                            </div>

                            {/* Correct answer — only show if wrong */}
                            {!ga.isCorrect && (
                              <div
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  background: 'rgba(16,185,129,0.06)',
                                  border: '1px solid rgba(16,185,129,0.1)',
                                  fontSize: '0.82rem',
                                }}
                              >
                                <span style={{ color: 'var(--text-muted)' }}>Correct answer: </span>
                                <span style={{ color: '#10b981', fontWeight: '600' }}>
                                  {ga.correctAnswer}
                                </span>
                              </div>
                            )}

                            {/* Explanation */}
                            {ga.solution && (
                              <div
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  background: 'rgba(165,180,252,0.04)',
                                  border: '1px solid rgba(165,180,252,0.08)',
                                  fontSize: '0.82rem',
                                  color: 'var(--text-secondary)',
                                  lineHeight: '1.6',
                                }}
                              >
                                <span
                                  style={{
                                    color: 'var(--text-secondary)',
                                    fontWeight: '600',
                                    display: 'block',
                                    marginBottom: '4px',
                                  }}
                                >
                                  💡 Explanation
                                </span>
                                {ga.solution}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* ── Scenario Performance ──────────────────────────── */}
        {results.gradedAnswers && (() => {
          const scenarioAnswers = results.gradedAnswers!.filter(
            (ga) => ['SCENARIO_MCQ', 'SCENARIO_SUBJECTIVE'].includes((ga.type ?? '').toUpperCase())
          );
          if (scenarioAnswers.length === 0) return null;

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="glass-card"
              style={{ padding: '2rem', marginBottom: '1.5rem' }}
            >
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Target size={20} color="#f59e0b" />
                Scenario-Based Performance
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    fontSize: '0.8rem',
                    color: '#fbbf24',
                    fontWeight: '400',
                  }}
                >
                  Real-World Analytics
                </span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {scenarioAnswers.map((ga, idx) => {
                  const isSubjective = (ga.type ?? '').toUpperCase() === 'SCENARIO_SUBJECTIVE';
                  const accuracyScore = ga.accuracyScore ?? 0;
                  const scoreColor = accuracyScore >= 80 ? '#10b981'
                    : accuracyScore >= 50 ? '#f59e0b'
                      : '#ef4444';

                  return (
                    <div
                      key={idx}
                      style={{
                        borderRadius: '14px',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04), rgba(99, 102, 241, 0.02))',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '14px',
                            background: isSubjective
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(99, 102, 241, 0.12)',
                            fontSize: '0.7rem',
                            color: isSubjective ? '#f59e0b' : '#a5b4fc',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {isSubjective ? '✍️ Subjective' : '🎯 Scenario MCQ'}
                        </span>
                        {!isSubjective && (
                          ga.isCorrect ? (
                            <CheckCircle2 size={16} color="#10b981" />
                          ) : (
                            <XCircle size={16} color="#ef4444" />
                          )
                        )}
                        {isSubjective && (
                          <span
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              color: scoreColor,
                            }}
                          >
                            {accuracyScore}% Accuracy
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div style={{ padding: '16px 18px' }}>
                        {/* Scenario context */}
                        {ga.scenario && (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: 'rgba(245, 158, 11, 0.04)',
                              border: '1px solid rgba(245, 158, 11, 0.1)',
                              marginBottom: '12px',
                              fontSize: '0.82rem',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.6',
                            }}
                          >
                            <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              📋 Scenario
                            </span>
                            <p style={{ marginTop: '4px' }}>{ga.scenario}</p>
                          </div>
                        )}

                        {/* Question */}
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '12px' }}>
                          {ga.content}
                        </p>

                        {/* Subjective: Accuracy ring + feedback */}
                        {isSubjective && (
                          <div style={{ marginBottom: '12px' }}>
                            {/* Accuracy bar */}
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                marginBottom: '6px', fontSize: '0.78rem',
                              }}>
                                <span style={{ color: 'var(--text-muted)' }}>AI Accuracy Score</span>
                                <span style={{ color: scoreColor, fontWeight: '700' }}>{accuracyScore}%</span>
                              </div>
                              <div style={{
                                height: '8px', borderRadius: '4px',
                                background: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                              }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${accuracyScore}%` }}
                                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                  style={{
                                    height: '100%',
                                    borderRadius: '4px',
                                    background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}80)`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* LLM Feedback */}
                            {ga.feedback && (
                              <div style={{
                                padding: '12px 14px', borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.04)',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                marginBottom: '12px', fontSize: '0.82rem',
                                color: 'var(--text-secondary)', lineHeight: '1.6',
                              }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                                  🧠 AI Feedback
                                </span>
                                {ga.feedback}
                              </div>
                            )}

                            {/* Key points covered & missed */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {ga.keyPointsCovered && ga.keyPointsCovered.length > 0 && (
                                <div style={{
                                  padding: '10px 12px', borderRadius: '8px',
                                  background: 'rgba(16, 185, 129, 0.04)',
                                  border: '1px solid rgba(16, 185, 129, 0.1)',
                                }}>
                                  <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                    ✅ Points Covered
                                  </span>
                                  <ul style={{ margin: '6px 0 0', paddingLeft: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    {ga.keyPointsCovered.map((pt, j) => (
                                      <li key={j}>{pt}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {ga.keyPointsMissed && ga.keyPointsMissed.length > 0 && (
                                <div style={{
                                  padding: '10px 12px', borderRadius: '8px',
                                  background: 'rgba(239, 68, 68, 0.04)',
                                  border: '1px solid rgba(239, 68, 68, 0.1)',
                                }}>
                                  <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                    ❌ Points Missed
                                  </span>
                                  <ul style={{ margin: '6px 0 0', paddingLeft: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    {ga.keyPointsMissed.map((pt, j) => (
                                      <li key={j}>{pt}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Your answer */}
                        <div
                          style={{
                            padding: '10px 14px', borderRadius: '8px',
                            background: ga.isCorrect
                              ? 'rgba(16,185,129,0.06)'
                              : isSubjective
                                ? 'rgba(245,158,11,0.06)'
                                : 'rgba(239,68,68,0.06)',
                            border: ga.isCorrect
                              ? '1px solid rgba(16,185,129,0.1)'
                              : isSubjective
                                ? '1px solid rgba(245,158,11,0.1)'
                                : '1px solid rgba(239,68,68,0.1)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>Your answer: </span>
                          <span
                            style={{
                              color: ga.isCorrect ? '#10b981' : isSubjective ? '#fbbf24' : '#ef4444',
                              fontWeight: '600',
                              whiteSpace: isSubjective ? 'pre-wrap' : undefined,
                            }}
                          >
                            {ga.userAnswer || '(no answer)'}
                          </span>
                        </div>

                        {/* Correct answer / sample answer */}
                        {(!ga.isCorrect || isSubjective) && ga.correctAnswer && (
                          <div
                            style={{
                              padding: '10px 14px', borderRadius: '8px',
                              background: 'rgba(16,185,129,0.06)',
                              border: '1px solid rgba(16,185,129,0.1)',
                              marginTop: '8px', fontSize: '0.82rem',
                            }}
                          >
                            <span style={{ color: 'var(--text-muted)' }}>
                              {isSubjective ? 'Sample answer: ' : 'Correct answer: '}
                            </span>
                            <span style={{ color: '#10b981', fontWeight: '600', whiteSpace: isSubjective ? 'pre-wrap' : undefined }}>
                              {ga.correctAnswer}
                            </span>
                          </div>
                        )}

                        {/* Explanation */}
                        {!isSubjective && ga.solution && (
                          <div
                            style={{
                              padding: '10px 14px', borderRadius: '8px',
                              background: 'rgba(165,180,252,0.04)',
                              border: '1px solid rgba(165,180,252,0.08)',
                              marginTop: '8px', fontSize: '0.82rem',
                              color: 'var(--text-secondary)', lineHeight: '1.6',
                            }}
                          >
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                              💡 Explanation
                            </span>
                            {ga.solution}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* ── Focus Topics ────────────────────────────────── */}
        {results.focusTopics && results.focusTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card"
            style={{ padding: '2rem', marginBottom: '1.5rem' }}
          >
            <h3
              style={{
                fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              <AlertCircle size={20} color="#f59e0b" />
              Topics to Focus On
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {results.focusTopics.map((topic, i) => (
                <span
                  key={i}
                  style={{
                    padding: '6px 14px', borderRadius: '20px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24', fontSize: '0.82rem', fontWeight: '600',
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Mentorship CTA ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            marginBottom: '1.5rem',
            padding: '1.75rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.05))',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: 'linear-gradient(90deg, #6366f1, #06b6d4, #10b981)',
            }}
          />
          <MessageCircle size={28} color="var(--text-accent)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Want Personalized Mentorship?
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Get 1-on-1 guidance from experienced data analytics mentors for doubt-clearing, career growth, and interview preparation.
          </p>
          <a
            href="https://mentorship-platform-ve5o.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.95rem',
              textDecoration: 'none', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
              transition: 'transform 0.2s',
            }}
          >
            <MessageCircle size={16} />
            Connect with a Mentor
            <ArrowRight size={14} />
          </a>
        </motion.div>

        {/* ── Actions ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
          }}
        >
          <Link
            href="/quiz"
            className="btn-primary"
            style={{
              justifyContent: 'center',
              textDecoration: 'none',
              padding: '14px',
              gap: '8px',
            }}
          >
            <Repeat size={18} />
            New Quiz
          </Link>
          <Link
            href="/leaderboard"
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(245,158,11,0.2)',
              background: 'rgba(245,158,11,0.04)',
              color: '#fbbf24',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            <Trophy size={18} />
            Leaderboard
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
