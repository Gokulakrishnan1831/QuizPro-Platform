'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function ActiveQuizPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    fetch(`/api/quiz/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setLoading(false);
      });
  }, [sessionId]);

  useEffect(() => {
    if (!isAnswered && !loading) {
      const interval = setInterval(() => setTimer(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isAnswered, loading]);

  const handleAnswer = async (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const currentQuestion = session.questions[currentIndex];
    const res = await fetch('/api/quiz/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizQuestionId: currentQuestion.id,
        userAnswer: answer,
        timeSpentSecs: timer
      })
    });
    const data = await res.json();
    setFeedback(data);
  };

  const handleNext = async () => {
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setFeedback(null);
      setTimer(0);
    } else {
      await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      router.push(`/quiz/results/${sessionId}`);
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Loading Quiz...</div>;

  const currentQuizQuestion = session.questions[currentIndex];
  const question = currentQuizQuestion.question;
  const options = JSON.parse(question.options);
  const progress = ((currentIndex + 1) / session.totalQuestions) * 100;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
      <Navbar />
      
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#a5b4fc', fontSize: '0.9rem' }}>
            <span>Question {currentIndex + 1} of {session.totalQuestions}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} /> {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
            </span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              style={{ height: '100%', background: 'linear-gradient(to right, var(--primary), var(--secondary))' }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card"
            style={{ padding: '2.5rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <span style={{ 
                padding: '4px 12px', 
                borderRadius: '20px', 
                background: 'rgba(255,255,255,0.05)', 
                fontSize: '0.75rem', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#a5b4fc'
              }}>
                {question.difficulty}
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.5', marginBottom: '2rem' }}>
              {question.question}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {options.map((option: string, i: number) => {
                let borderColor = 'rgba(255,255,255,0.1)';
                let bgColor = 'transparent';
                
                if (isAnswered) {
                  if (option === feedback?.correctAnswer) {
                    borderColor = 'var(--success)';
                    bgColor = 'rgba(16, 185, 129, 0.1)';
                  } else if (option === selectedAnswer && !feedback?.isCorrect) {
                    borderColor = 'var(--error)';
                    bgColor = 'rgba(239, 68, 68, 0.1)';
                  }
                } else if (selectedAnswer === option) {
                  borderColor = 'var(--primary)';
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor,
                      background: bgColor,
                      color: 'white',
                      textAlign: 'left',
                      fontSize: '1rem',
                      cursor: isAnswered ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    {option}
                    {isAnswered && option === feedback?.correctAnswer && <CheckCircle2 size={20} color="var(--success)" />}
                    {isAnswered && option === selectedAnswer && !feedback?.isCorrect && <XCircle size={20} color="var(--error)" />}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <h4 style={{ color: '#a5b4fc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={18} /> Explanation
                </h4>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#cbd5e1' }}>
                  {feedback?.explanation}
                </p>
                <button 
                  onClick={handleNext}
                  className="btn-primary" 
                  style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
                >
                  {currentIndex === session.totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight size={20} />
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
