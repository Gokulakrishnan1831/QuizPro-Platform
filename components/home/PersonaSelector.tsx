'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase,
    ArrowLeftRight,
    GraduationCap,
    ArrowRight,
    Sparkles,
    X,
    Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const PERSONAS = [
    {
        id: 'SWITCHER',
        title: 'Career Switcher',
        icon: ArrowLeftRight,
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))',
        description:
            'Transitioning from another domain into data analytics? We will focus on core DA concepts and bridge your experience.',
        cta: "I'm switching careers",
        fields: ['experience'],
    },
    {
        id: 'JOB_HOPPER',
        title: 'Job Hopper',
        icon: Briefcase,
        color: '#06b6d4',
        gradient: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.02))',
        description:
            'Already working in DA and prepping for your next role? Paste the JD and we will tailor questions to that company.',
        cta: 'I have a target JD',
        fields: ['jd'],
    },
    {
        id: 'FRESHER',
        title: 'Fresh Graduate',
        icon: GraduationCap,
        color: '#10b981',
        gradient: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))',
        description:
            'New to the field? We will start from the fundamentals and build confidence with progressive difficulty.',
        cta: "I'm just starting out",
        fields: ['education'],
    },
];

export default function PersonaSelector() {
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [teaserLoading, setTeaserLoading] = useState(false);
    const [teaserQuestion, setTeaserQuestion] = useState<any>(null);
    const [teaserAnswer, setTeaserAnswer] = useState<string | null>(null);
    const [teaserResult, setTeaserResult] = useState<{
        isCorrect: boolean;
        correctAnswer: string;
        explanation: string;
    } | null>(null);
    const router = useRouter();

    const handlePersonaClick = (id: string) => {
        setSelectedPersona(id);
        setShowModal(true);
        setTeaserQuestion(null);
        setTeaserAnswer(null);
        setTeaserResult(null);
    };

    const handleTryTeaser = async () => {
        setTeaserLoading(true);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skill: 'SQL', difficulty: 4 }),
            });
            const q = await res.json();
            setTeaserQuestion(q);
        } catch {
            setTeaserQuestion({
                type: 'MCQ',
                skill: 'SQL',
                content: 'Which SQL keyword is used to filter rows based on a condition?',
                options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'],
                correctAnswer: 'WHERE',
                solution: 'WHERE is used to filter rows before any grouping occurs.',
                difficulty: 3,
            });
        }
        setTeaserLoading(false);
    };

    const handleTeaserAnswer = (answer: string) => {
        if (teaserAnswer) return;
        setTeaserAnswer(answer);
        const isCorrect =
            answer.trim().toLowerCase() ===
            teaserQuestion.correctAnswer.trim().toLowerCase();
        setTeaserResult({
            isCorrect,
            correctAnswer: teaserQuestion.correctAnswer,
            explanation: teaserQuestion.solution,
        });
    };

    const persona = PERSONAS.find((p) => p.id === selectedPersona);

    return (
        <>
            <section
                id="personas"
                style={{
                    padding: '80px 20px',
                    maxWidth: '1100px',
                    margin: '0 auto',
                }}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '3rem' }}
                >
                    <h2
                        style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            marginBottom: '0.75rem',
                        }}
                    >
                        Who Are <span className="text-gradient">You</span>?
                    </h2>
                    <p style={{ color: 'var(--text-accent)', fontSize: '1.1rem' }}>
                        Choose your profile and we will customize your quiz experience
                    </p>
                </motion.div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem',
                    }}
                >
                    {PERSONAS.map((p, i) => {
                        const Icon = p.icon;
                        return (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                onClick={() => handlePersonaClick(p.id)}
                                className="glass-card"
                                style={{
                                    padding: '2.5rem 2rem',
                                    cursor: 'pointer',
                                    background: p.gradient,
                                    border: `1px solid ${p.color}25`,
                                    textAlign: 'center',
                                    transition: 'box-shadow 0.3s',
                                }}
                            >
                                <div
                                    style={{
                                        width: '72px',
                                        height: '72px',
                                        borderRadius: '20px',
                                        background: `${p.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 1.5rem',
                                    }}
                                >
                                    <Icon size={36} color={p.color} />
                                </div>
                                <h3
                                    style={{
                                        fontSize: '1.4rem',
                                        fontWeight: '700',
                                        marginBottom: '0.75rem',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {p.title}
                                </h3>
                                <p
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5',
                                        marginBottom: '1.5rem',
                                    }}
                                >
                                    {p.description}
                                </p>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: p.color,
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {p.cta} <ArrowRight size={16} />
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <AnimatePresence>
                {showModal && persona && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            background: 'var(--overlay-bg)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card"
                            style={{
                                padding: '3rem',
                                maxWidth: '520px',
                                width: '100%',
                                position: 'relative',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                background: 'var(--card-bg-solid)'
                            }}
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={22} />
                            </button>

                            {!teaserQuestion ? (
                                <>
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <div
                                            style={{
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '16px',
                                                background: `${persona.color}15`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 1rem',
                                            }}
                                        >
                                            <persona.icon size={32} color={persona.color} />
                                        </div>
                                        <h3
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                marginBottom: '0.5rem',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            {persona.title}
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {persona.description}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                        }}
                                    >
                                        <button
                                            onClick={handleTryTeaser}
                                            disabled={teaserLoading}
                                            style={{
                                                padding: '14px',
                                                borderRadius: '10px',
                                                border: `1px solid ${persona.color}40`,
                                                background: `${persona.color}10`,
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            {teaserLoading ? (
                                                <>
                                                    <Loader2
                                                        size={18}
                                                        style={{ animation: 'spin 1s linear infinite' }}
                                                    />{' '}
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={18} /> Try a Free Sample Question
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowModal(false);
                                                router.push('/get-started');
                                            }}
                                            className="btn-primary"
                                            style={{
                                                width: '100%',
                                                justifyContent: 'center',
                                                padding: '14px',
                                            }}
                                        >
                                            Sign Up & Start Full Quiz <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <span
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                background: 'rgba(99,102,241,0.1)',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-accent)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                            }}
                                        >
                                            {teaserQuestion.skill} · Sample
                                        </span>
                                    </div>

                                    <h3
                                        style={{
                                            fontSize: '1.2rem',
                                            fontWeight: '600',
                                            lineHeight: '1.5',
                                            marginBottom: '1.5rem',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        {teaserQuestion.content}
                                    </h3>

                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem',
                                            marginBottom: '1.5rem',
                                        }}
                                    >
                                        {teaserQuestion.options?.map((opt: string, i: number) => {
                                            let borderColor = 'var(--border-color)';
                                            let bgColor = 'var(--input-bg)';
                                            let textColor = 'var(--text-primary)';

                                            if (teaserResult) {
                                                if (opt === teaserResult.correctAnswer) {
                                                    borderColor = 'var(--success)';
                                                    bgColor = 'rgba(16,185,129,0.1)';
                                                    textColor = 'var(--success)';
                                                } else if (
                                                    opt === teaserAnswer &&
                                                    !teaserResult.isCorrect
                                                ) {
                                                    borderColor = 'var(--error)';
                                                    bgColor = 'rgba(239,68,68,0.1)';
                                                    textColor = 'var(--error)';
                                                }
                                            }

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleTeaserAnswer(opt)}
                                                    disabled={!!teaserAnswer}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderRadius: '10px',
                                                        border: '1px solid',
                                                        borderColor,
                                                        background: bgColor,
                                                        color: textColor,
                                                        textAlign: 'left',
                                                        cursor: teaserAnswer ? 'default' : 'pointer',
                                                        fontSize: '0.95rem',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {teaserResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '10px',
                                                    background: 'var(--subtle-bg)',
                                                    border: '1px solid var(--border-color)',
                                                    marginBottom: '1.25rem',
                                                }}
                                            >
                                                <p
                                                    style={{
                                                        fontWeight: '700',
                                                        marginBottom: '0.5rem',
                                                        color: teaserResult.isCorrect
                                                            ? 'var(--success)'
                                                            : 'var(--error)',
                                                    }}
                                                >
                                                    {teaserResult.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: '0.9rem',
                                                        color: 'var(--text-secondary)',
                                                        lineHeight: '1.5',
                                                    }}
                                                >
                                                    {teaserResult.explanation}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setShowModal(false);
                                                    router.push('/get-started');
                                                }}
                                                className="btn-primary"
                                                style={{
                                                    width: '100%',
                                                    justifyContent: 'center',
                                                    padding: '14px',
                                                }}
                                            >
                                                Sign Up for Full Quiz <ArrowRight size={18} />
                                            </button>
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
