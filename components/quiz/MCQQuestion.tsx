'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/* ─── Types ─────────────────────────────────────────────────── */

export interface MCQQuestionData {
    type: 'MCQ';
    skill: string;
    content: string;
    options: string[];
    correctAnswer: string;
    solution: string;
    difficulty: number;
}

export interface MCQResult {
    userAnswer: string;
    isCorrect: boolean | null;
    correctAnswer: string;
    explanation: string;
}

interface MCQQuestionProps {
    question: MCQQuestionData;
    onAnswer: (answer: string) => void;
    result: MCQResult | null;
    selectedAnswer: string | null;
    disabled: boolean;
    footer?: React.ReactNode;
}

/* ─── Skill Colours ─────────────────────────────────────────── */

const SKILL_COLORS: Record<string, string> = {
    SQL: '#6366f1',
    EXCEL: '#10b981',
    Excel: '#10b981',
    POWERBI: '#06b6d4',
    'Power BI': '#06b6d4',
};

/* ─── Component ─────────────────────────────────────────────── */

export default function MCQQuestion({
    question,
    onAnswer,
    result,
    selectedAnswer,
    disabled,
    footer,
}: MCQQuestionProps) {
    const skillColor = SKILL_COLORS[question.skill] ?? '#6366f1';
    const [localSelection, setLocalSelection] = useState<string | null>(null);

    // Reset local selection when question changes
    useEffect(() => {
        setLocalSelection(null);
    }, [question.content]);

    const currentSelection = disabled ? selectedAnswer : localSelection;

    return (
        <div>
            {/* Skill & difficulty badges */}
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
                        background: `${skillColor}15`,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: skillColor,
                        fontWeight: '600',
                    }}
                >
                    {question.skill}
                </span>
                <span
                    style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        letterSpacing: '0.5px',
                    }}
                >
                    Difficulty {question.difficulty}/10
                </span>
            </div>

            {/* Question text */}
            <h2
                style={{
                    fontSize: '1.35rem',
                    fontWeight: '600',
                    lineHeight: '1.6',
                    marginBottom: '2rem',
                    color: '#f1f5f9',
                }}
            >
                {question.content}
            </h2>

            {/* Options */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}
            >
                {question.options?.map((option, i) => {
                    let borderColor = 'rgba(255,255,255,0.08)';
                    let bgColor = 'rgba(255,255,255,0.02)';

                    if (currentSelection === option) {
                        borderColor = 'var(--primary)';
                        bgColor = 'rgba(99, 102, 241, 0.05)';
                    }

                    const optionLabel = String.fromCharCode(65 + i);

                    return (
                        <motion.button
                            key={i}
                            whileHover={disabled ? {} : { scale: 1.01 }}
                            whileTap={disabled ? {} : { scale: 0.99 }}
                            onClick={() => !disabled && setLocalSelection(option)}
                            disabled={disabled}
                            style={{
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor,
                                background: bgColor,
                                color: 'white',
                                textAlign: 'left',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                cursor: disabled ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <span
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: '#6b7280',
                                    flexShrink: 0,
                                }}
                            >
                                {optionLabel}
                            </span>
                            <span style={{ flex: 1 }}>{option}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Slider footer passed from page */}
            {footer}

            {/* Submit Button */}
            {!disabled && (
                <div style={{ marginTop: '1.5rem' }}>
                    <motion.button
                        whileHover={localSelection ? { scale: 1.01 } : {}}
                        whileTap={localSelection ? { scale: 0.99 } : {}}
                        onClick={() => localSelection && onAnswer(localSelection)}
                        disabled={!localSelection}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '14px',
                            opacity: localSelection ? 1 : 0.5,
                        }}
                    >
                        Submit Answer
                    </motion.button>
                </div>
            )}


        </div>
    );
}
