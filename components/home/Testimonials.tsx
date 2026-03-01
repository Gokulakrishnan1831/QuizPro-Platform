'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
    {
        name: 'Priya Sharma',
        role: 'Data Analyst @ Amazon',
        avatar: 'PS',
        color: '#6366f1',
        quote:
            'The AI-generated questions were shockingly close to what I was asked in my actual Amazon interview. Got my offer within 3 weeks of using QuizPro.',
        stars: 5,
    },
    {
        name: 'Rohan Mehta',
        role: 'Business Analyst @ Flipkart',
        avatar: 'RM',
        color: '#06b6d4',
        quote:
            'As a career switcher from mechanical engineering, QuizPro helped me bridge the gap. The persona-specific quizzes were a game changer.',
        stars: 5,
    },
    {
        name: 'Sneha Iyer',
        role: 'Analytics Lead @ Swiggy',
        avatar: 'SI',
        color: '#10b981',
        quote:
            'The SQL hands-on questions and AI performance reports made my preparation 10x more efficient. Highly recommend for SQL prep.',
        stars: 5,
    },
    {
        name: 'Arjun Reddy',
        role: 'Data Analyst @ TCS',
        avatar: 'AR',
        color: '#f59e0b',
        quote:
            'I was a complete fresher. The progressive difficulty and detailed explanations helped me build confidence from scratch.',
        stars: 4,
    },
    {
        name: 'Kavya Nair',
        role: 'Senior Analyst @ Deloitte',
        avatar: 'KN',
        color: '#ec4899',
        quote:
            'I pasted the Deloitte JD and got questions tailored to their tech stack. That\'s the kind of targeted prep that works.',
        stars: 5,
    },
    {
        name: 'Vikram Joshi',
        role: 'Data Engineer @ Zerodha',
        avatar: 'VJ',
        color: '#8b5cf6',
        quote:
            'The leaderboard feature pushed me to practice more consistently. Went from 60% to 92% accuracy in 2 weeks.',
        stars: 5,
    },
];

export default function Testimonials() {
    return (
        <section
            style={{
                padding: '80px 20px',
                maxWidth: '1200px',
                margin: '0 auto',
            }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                style={{ textAlign: 'center', marginBottom: '3.5rem' }}
            >
                <h2
                    style={{
                        fontSize: '2.5rem',
                        fontWeight: '800',
                        marginBottom: '0.75rem',
                    }}
                >
                    Loved by <span className="text-gradient">Analysts</span>
                </h2>
                <p style={{ color: '#a5b4fc', fontSize: '1.1rem' }}>
                    See what our community has to say
                </p>
            </motion.div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '1.5rem',
                }}
            >
                {TESTIMONIALS.map((t, i) => (
                    <motion.div
                        key={t.name}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        className="glass-card"
                        style={{ padding: '2rem', position: 'relative' }}
                    >
                        <Quote
                            size={28}
                            color="rgba(99,102,241,0.15)"
                            style={{ position: 'absolute', top: '1rem', right: '1.25rem' }}
                        />

                        <div
                            style={{
                                display: 'flex',
                                gap: '4px',
                                marginBottom: '1rem',
                            }}
                        >
                            {Array.from({ length: 5 }).map((_, s) => (
                                <Star
                                    key={s}
                                    size={16}
                                    fill={s < t.stars ? '#f59e0b' : 'transparent'}
                                    color={s < t.stars ? '#f59e0b' : '#3f3f46'}
                                />
                            ))}
                        </div>

                        <p
                            style={{
                                color: '#cbd5e1',
                                fontSize: '0.95rem',
                                lineHeight: '1.6',
                                marginBottom: '1.5rem',
                                fontStyle: 'italic',
                            }}
                        >
                            "{t.quote}"
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: `${t.color}20`,
                                    color: t.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {t.avatar}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.role}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
