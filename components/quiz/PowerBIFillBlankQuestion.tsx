'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface PowerBIFillBlankQuestionData {
  type: 'POWERBI_FILL_BLANK';
  skill: 'POWERBI';
  content: string;
  blankLabel?: string;
  caseSensitive?: boolean;
  solution: string;
  difficulty: number;
}

interface PowerBIFillBlankQuestionProps {
  question: PowerBIFillBlankQuestionData;
  onSubmit: (answer: string) => void;
  disabled: boolean;
  result: { userAnswer: string } | null;
  footer?: React.ReactNode;
}

export default function PowerBIFillBlankQuestion({
  question,
  onSubmit,
  disabled,
  result,
  footer,
}: PowerBIFillBlankQuestionProps) {
  const [answer, setAnswer] = useState('');
  const currentAnswer = disabled ? (result?.userAnswer ?? '') : answer;

  useEffect(() => {
    setAnswer('');
  }, [question.content]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <span
          style={{
            padding: '4px 14px',
            borderRadius: '20px',
            background: '#06b6d415',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#06b6d4',
            fontWeight: '600',
          }}
        >
          POWERBI FILL BLANK
        </span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'var(--subtle-bg)',
            border: '1px solid var(--border-color)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          Difficulty {question.difficulty}/10
        </span>
      </div>

      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          lineHeight: '1.6',
          marginBottom: '1.25rem',
          color: 'var(--text-primary)',
        }}
      >
        {question.content}
      </h2>

      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '0.5rem',
        }}
      >
        {question.blankLabel || 'Answer'}
      </label>
      <input
        value={currentAnswer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer"
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          background: 'var(--background)',
          color: 'var(--text-primary)',
          outline: 'none',
          fontSize: '0.95rem',
          marginBottom: '0.5rem',
        }}
      />

      {question.caseSensitive ? (
        <p style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: 0 }}>
          Answer is case-sensitive.
        </p>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 0 }}>
          Answer is not case-sensitive.
        </p>
      )}

      {footer}

      {!disabled && (
        <motion.button
          whileHover={answer.trim() ? { scale: 1.01 } : {}}
          whileTap={answer.trim() ? { scale: 0.99 } : {}}
          onClick={() => answer.trim() && onSubmit(answer.trim())}
          disabled={!answer.trim()}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '14px',
            opacity: answer.trim() ? 1 : 0.5,
            marginTop: '1rem',
          }}
        >
          Submit Answer
        </motion.button>
      )}
    </div>
  );
}

