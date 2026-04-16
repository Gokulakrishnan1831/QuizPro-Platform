'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/* ─── Types ─────────────────────────────────────────────────── */

export interface ScenarioSubjectiveData {
  type: 'SCENARIO_SUBJECTIVE';
  skill: string;
  content: string;
  scenario: string;
  maxWords: number;
  rubric: string;
  sampleAnswer: string;
  difficulty: number;
}

interface ScenarioSubjectiveProps {
  question: ScenarioSubjectiveData;
  onSubmit: (answer: string) => void;
  result: { userAnswer: string; accuracyScore?: number; feedback?: string } | null;
  disabled: boolean;
  footer?: React.ReactNode;
}

/* ─── Component ─────────────────────────────────────────────── */

export default function ScenarioSubjectiveQuestion({
  question,
  onSubmit,
  result,
  disabled,
  footer,
}: ScenarioSubjectiveProps) {
  const [answer, setAnswer] = useState('');

  // Reset when question changes
  useEffect(() => {
    setAnswer('');
  }, [question.content]);

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > question.maxWords * 1.5;
  const canSubmit = !disabled && answer.trim().length >= 10;

  return (
    <div>
      {/* Scenario badge + difficulty */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <span
          style={{
            padding: '5px 14px',
            borderRadius: '20px',
            background: 'rgba(245, 158, 11, 0.12)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#f59e0b',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🎯 Scenario · Subjective
        </span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'var(--subtle-bg)',
            border: '1px solid var(--border-color)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.5px',
          }}
        >
          Difficulty {question.difficulty}/10
        </span>
      </div>

      {/* Scenario context card */}
      {question.scenario && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(99, 102, 241, 0.03))',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            lineHeight: '1.7',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '0.75rem',
              color: '#fbbf24',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            📋 Scenario Context
          </div>
          {question.scenario}
        </div>
      )}

      {/* Question text */}
      <h2
        style={{
          fontSize: '1.3rem',
          fontWeight: '600',
          lineHeight: '1.7',
          marginBottom: '1.75rem',
          color: 'var(--text-primary)',
        }}
      >
        {question.content}
      </h2>

      {/* Answer textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={disabled ? (result?.userAnswer ?? '') : answer}
          onChange={(e) => !disabled && setAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer here. Be specific and explain your reasoning..."
          rows={7}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: disabled
              ? 'var(--border-color)'
              : isOverLimit
                ? 'rgba(239, 68, 68, 0.3)'
                : answer.trim()
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'var(--border-color)',
            background: disabled
              ? 'var(--subtle-bg)'
              : 'var(--background)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            lineHeight: '1.7',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease',
            minHeight: '140px',
          }}
        />

        {/* Word count */}
        {!disabled && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
              fontSize: '0.78rem',
              padding: '0 4px',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              Write a detailed response addressing all key points
            </span>
            <span
              style={{
                color: isOverLimit
                  ? '#ef4444'
                  : wordCount > question.maxWords
                    ? '#f59e0b'
                    : 'var(--text-muted)',
                fontWeight: wordCount > question.maxWords ? '600' : '400',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {wordCount} / {question.maxWords} words
            </span>
          </div>
        )}
      </div>

      {/* Footer slot (confidence slider etc.) */}
      {footer}

      {/* Submit Button */}
      {!disabled && (
        <div style={{ marginTop: '1.5rem' }}>
          <motion.button
            whileHover={canSubmit ? { scale: 1.01 } : {}}
            whileTap={canSubmit ? { scale: 0.99 } : {}}
            onClick={() => canSubmit && onSubmit(answer.trim())}
            disabled={!canSubmit}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px',
              opacity: canSubmit ? 1 : 0.5,
              gap: '8px',
            }}
          >
            ✍️ Submit Answer
          </motion.button>
          {answer.trim().length > 0 && answer.trim().length < 10 && (
            <p
              style={{
                color: '#f59e0b',
                fontSize: '0.78rem',
                marginTop: '6px',
                textAlign: 'center',
              }}
            >
              Please write at least a few words to submit
            </p>
          )}
        </div>
      )}
    </div>
  );
}
