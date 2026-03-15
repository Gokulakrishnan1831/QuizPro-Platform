'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import QuestionRenderer, {
  type QuestionResult,
} from '@/components/quiz/QuestionRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  Loader2,
  Flag,
} from 'lucide-react';
import { track } from '@/lib/analytics';
import { useProctoring } from '@/hooks/useProctoring';
import {
  ProctoringGate,
  TabSwitchWarningDialog,
  TabSwitchBadge,
} from '@/components/quiz/ProctoringOverlay';

/* ─── Types ─────────────────────────────────────────────────── */

interface QuizData {
  id: string;
  timerMins: number;
  totalQuestions: number;
  questions: any[];
}

/* ─── Confidence Slider ─────────────────────────────────────── */

function ConfidenceSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const label =
    value <= 25
      ? 'Guessing'
      : value <= 50
        ? 'Unsure'
        : value <= 75
          ? 'Fairly confident'
          : 'Very confident';

  const color =
    value <= 25
      ? '#ef4444'
      : value <= 50
        ? '#f59e0b'
        : value <= 75
          ? '#06b6d4'
          : '#10b981';

  return (
    <div
      style={{
        marginTop: '1.25rem',
        padding: '1rem',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          fontSize: '0.8rem',
        }}
      >
        <span style={{ color: '#6b7280' }}>Confidence</span>
        <span style={{ color, fontWeight: '600' }}>{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          accentColor: color,
          cursor: disabled ? 'default' : 'pointer',
        }}
      />
    </div>
  );
}

/* ─── Timer Component ───────────────────────────────────────── */

function Timer({
  seconds,
  timerMins,
}: {
  seconds: number;
  timerMins: number;
}) {
  const totalSeconds = timerMins * 60;
  const remaining = Math.max(0, totalSeconds - seconds);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (remaining / totalSeconds) * 100;

  const isWarning = pct < 20;
  const color = isWarning ? '#ef4444' : '#a5b4fc';

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color,
        fontWeight: isWarning ? '700' : '400',
        animation: isWarning ? 'pulse 1.5s ease infinite' : undefined,
      }}
    >
      <Clock size={16} />
      {mins}:{String(secs).padStart(2, '0')}
      {isWarning && <AlertTriangle size={14} />}
    </span>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function ActiveQuizPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const isE2EProctoring = process.env.NEXT_PUBLIC_E2E_PROCTORING === '1';
  const { sessionId } = use(params);
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confidence, setConfidence] = useState(50);
  const [answers, setAnswers] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [proctoringReady, setProctoringReady] = useState(false);
  const monitoringVideoRef = useRef<HTMLVideoElement | null>(null);

  // ── Fetch quiz data ─────────────────────────────────────────
  useEffect(() => {
    async function loadQuiz() {
      // Try API first
      try {
        const res = await fetch(`/api/quiz/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setQuiz(data);
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }

      // Fallback: sessionStorage (pre-migration mode)
      const stored = sessionStorage.getItem(`quiz-data-${sessionId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setQuiz({
          id: data.id,
          timerMins: data.timerMins ?? 20,
          totalQuestions: data.questions.length,
          questions: data.questions,
        });
        setLoading(false);
        return;
      }

      // Nothing found — redirect
      router.push('/quiz');
    }

    loadQuiz();
  }, [sessionId, router]);

  // ── Timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !proctoringReady) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, proctoringReady]);

  // ── Auto-submit when time runs out ──────────────────────────
  useEffect(() => {
    if (!quiz) return;
    if (timer >= quiz.timerMins * 60 && !submitting) {
      handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

  // ── Handle quiz finish (wrapped for proctoring) ─────────────
  const handleFinishRef = useCallback(() => {
    handleFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, submitting, answers, timer]);

  // ── Proctoring hook ─────────────────────────────────────────
  const proctoring = useProctoring({
    enabled: !loading && proctoringReady,
    maxTabSwitches: 2,
    onTerminate: handleFinishRef,
    ...(isE2EProctoring
      ? {
          monitorIntervalMs: 250,
          faceViolationGraceMs: 1200,
          cameraOffGraceMs: 1000,
          faceRecoveryStableMs: 1000,
          minConsecutiveSamples: 2,
          violationCooldownMs: 1200,
          startFaceCheckTimeoutMs: 2500,
          startFaceCheckStableMs: 500,
          startFaceCheckPollMs: 100,
        }
      : {}),
  });

  useEffect(() => {
    const videoEl = monitoringVideoRef.current;
    if (!videoEl || !proctoring.cameraStream) return;
    videoEl.srcObject = proctoring.cameraStream;
  }, [proctoring.cameraStream]);

  useEffect(() => {
    const videoEl = monitoringVideoRef.current;
    if (!proctoringReady || !videoEl || !proctoring.cameraStream) return;
    void proctoring.startFaceMonitoring(videoEl);
    return () => {
      proctoring.stopFaceMonitoring();
    };
  }, [proctoringReady, proctoring.cameraStream, proctoring.startFaceMonitoring, proctoring.stopFaceMonitoring]);

  // ── Handle answer from QuestionRenderer ─────────────────────
  // No instant feedback — record answer and auto-advance.
  const handleAnswer = (result: QuestionResult) => {
    result.confidence = confidence;
    setAnswers((prev) => [...prev, result]);

    // Auto-advance to next question (or finish on last)
    if (!quiz) return;
    if (currentIndex < quiz.totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      setConfidence(50);
    } else {
      // Last question — finish the quiz
      // Use a microtask so the answer state update settles first
      setTimeout(() => handleFinish(), 0);
    }
  };

  // ── Finish quiz ─────────────────────────────────────────────
  const handleFinish = async () => {
    if (!quiz || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: answers.map((a) => ({
            questionIndex: a.questionIndex,
            userAnswer: a.userAnswer,
            confidence: a.confidence,
          })),
          timeTaken: timer,
          questions: quiz.questions,
          tabSwitchCount: proctoring.tabSwitchCount,
          terminatedByProctor: proctoring.terminated,
          proctoringSummary: {
            violationsTotal: proctoring.violationCount,
            terminatedByProctor: proctoring.terminated,
            terminationReason: proctoring.terminatedReason ?? undefined,
          },
          proctoringEvents: proctoring.violationEvents,
        }),
      });
      const results = await res.json();
      // Track quiz completion
      void track('quiz_completed', {
        score: results.score,
        totalQuestions: results.totalQuestions,
        totalCorrect: results.totalCorrect,
        timeTaken: timer,
      });
      sessionStorage.setItem(
        `quiz-results-${quiz.id}`,
        JSON.stringify(results)
      );
      proctoring.cleanup();
      router.push(`/quiz/results/${quiz.id}`);
    } catch {
      // Offline grading fallback
      const totalCorrect = answers.filter((a) => a.isCorrect === true).length;
      const score =
        answers.length > 0 ? (totalCorrect / answers.length) * 100 : 0;
      const results = {
        attemptId: null,
        score,
        totalCorrect,
        totalQuestions: answers.length,
        aiSummary: null,
        wrongCount: answers.filter((a) => a.isCorrect === false).length,
        // Build local gradedAnswers for offline answer review
        gradedAnswers: answers.map((a) => {
          const q = quiz.questions[a.questionIndex];
          return {
            questionIndex: a.questionIndex,
            userAnswer: a.userAnswer,
            isCorrect: a.isCorrect,
            correctAnswer: q?.correctAnswer ?? '',
            solution: q?.solution ?? '',
            content: q?.content ?? '',
            skill: q?.skill ?? '',
            type: q?.type ?? 'MCQ',
            confidence: a.confidence,
          };
        }),
      };
      sessionStorage.setItem(
        `quiz-results-${quiz.id}`,
        JSON.stringify(results)
      );
      proctoring.cleanup();
      router.push(`/quiz/results/${quiz.id}`);
    }

  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  /* ── Loading state ─────────────────────────────────────────── */
  if (loading || !quiz) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <Loader2
          size={36}
          color="var(--primary)"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <p style={{ color: '#a5b4fc' }}>Loading Quiz...</p>
      </div>
    );
  }

  /* ── Current question ──────────────────────────────────────── */
  const currentQuestion = quiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / quiz.totalQuestions) * 100;
  const currentResult = answers.find(
    (a) => a.questionIndex === currentIndex
  ) ?? null;
  const isHandsOn = ['SQL_HANDS_ON', 'EXCEL_HANDS_ON'].includes(
    (currentQuestion.type ?? 'MCQ').toUpperCase()
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        paddingTop: '100px',
        paddingBottom: '80px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <Navbar />

      {/* Proctoring Gate — shown before quiz starts */}
      {!proctoringReady && (
        <ProctoringGate
          onReady={() => {
            setProctoringReady(true);
            proctoring.markReady();
          }}
          requestCamera={proctoring.requestCamera}
          requestFullscreen={proctoring.requestFullscreen}
          runStartFaceCheck={proctoring.runStartFaceCheck}
          cameraStream={proctoring.cameraStream}
          cameraError={proctoring.cameraError}
          faceStatus={proctoring.faceStatus}
        />
      )}

      {/* Tab Switch Warning Dialog */}
      <TabSwitchWarningDialog
        show={proctoring.showWarning}
        message={proctoring.warningMessage}
        terminated={proctoring.terminated}
        onDismiss={proctoring.dismissWarning}
      />

      {/* Hidden camera feed for background proctoring checks */}
      {proctoringReady && (
        <video
          ref={monitoringVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '320px',
            height: '240px',
            opacity: 0,
            pointerEvents: 'none',
            objectFit: 'cover',
          }}
          aria-hidden="true"
        />
      )}

      {proctoringReady && (
        <main
          style={{
            maxWidth: isHandsOn ? '900px' : '800px',
            margin: '0 auto',
            padding: '0 20px',
          }}
        >
        {/* ── Top Bar: Progress + Timer + Flag ──────────────── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            <span style={{ color: '#a5b4fc' }}>
              Question {currentIndex + 1}{' '}
              <span style={{ color: '#4b5563' }}>/ {quiz.totalQuestions}</span>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <TabSwitchBadge count={proctoring.tabSwitchCount} />
              <button
                onClick={toggleFlag}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: flagged.has(currentIndex) ? '#f59e0b' : '#4b5563',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                }}
                title="Flag for review"
              >
                <Flag
                  size={16}
                  fill={flagged.has(currentIndex) ? '#f59e0b' : 'none'}
                />
                {flagged.size > 0 && `(${flagged.size})`}
              </button>
              <Timer seconds={timer} timerMins={quiz.timerMins} />
            </div>
          </div>

          <div
            style={{
              height: '6px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 80 }}
              style={{
                height: '100%',
                background:
                  'linear-gradient(to right, var(--primary), var(--secondary))',
                borderRadius: '3px',
              }}
            />
          </div>

          {/* Question dots */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginTop: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {quiz.questions.map((_: any, i: number) => {
              const answered = answers.find((a) => a.questionIndex === i);
              let bg = 'rgba(255,255,255,0.08)';
              if (answered?.isCorrect === true) {
                bg = answered.isCorrect
                  ? 'rgba(16,185,129,0.5)'
                  : 'rgba(239,68,68,0.5)';
              } else if (answered?.isCorrect === false) {
                bg = 'rgba(239,68,68,0.5)';
              }
              if (i === currentIndex) {
                bg = 'var(--primary)';
              }

              // Show different dot style for hands-on questions
              const qType = (quiz.questions[i]?.type ?? 'MCQ').toUpperCase();
              const isHO = ['SQL_HANDS_ON', 'EXCEL_HANDS_ON'].includes(qType);

              return (
                <div
                  key={i}
                  style={{
                    width: isHO ? '14px' : '10px',
                    height: '10px',
                    borderRadius: isHO ? '3px' : '50%',
                    background: bg,
                    border: flagged.has(i)
                      ? '2px solid #f59e0b'
                      : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* ── Question Card ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="glass-card"
            style={{ padding: '2.5rem' }}
          >
            <QuestionRenderer
              question={currentQuestion}
              questionIndex={currentIndex}
              onAnswer={handleAnswer}
              result={currentResult}
              disabled={!!currentResult}
              footer={
                !currentResult && !isHandsOn ? (
                  <ConfidenceSlider
                    value={confidence}
                    onChange={setConfidence}
                    disabled={!!currentResult}
                  />
                ) : null
              }
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Submitting Overlay ────────────────────────────── */}
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(15,15,35,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
            }}
          >
            <Loader2
              size={48}
              color="var(--primary)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <p
              style={{
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: '600',
              }}
            >
              Grading & generating AI analysis...
            </p>
          </motion.div>
        )}
        </main>
      )}
    </div>
  );
}
