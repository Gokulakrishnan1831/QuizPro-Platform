'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CTASection() {
    return (
        <section
            style={{
                padding: '80px 20px',
                maxWidth: '900px',
                margin: '0 auto',
                textAlign: 'center',
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="glass-card"
                style={{
                    padding: '4rem 3rem',
                    background:
                        'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.08))',
                    border: '1px solid rgba(99,102,241,0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative orb */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-60px',
                        right: '-60px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(99,102,241,0.12)',
                        filter: 'blur(80px)',
                        borderRadius: '50%',
                    }}
                />

                <h2
                    style={{
                        fontSize: '2.25rem',
                        fontWeight: '800',
                        marginBottom: '1rem',
                        position: 'relative',
                    }}
                >
                    Ready to <span className="text-gradient">Level Up</span>?
                </h2>
                <p
                    style={{
                        color: '#a5b4fc',
                        fontSize: '1.1rem',
                        lineHeight: '1.6',
                        marginBottom: '2rem',
                        maxWidth: '550px',
                        margin: '0 auto 2rem',
                        position: 'relative',
                    }}
                >
                    Start with a free quiz today. No credit card required. Upgrade anytime
                    when you're ready for the full experience.
                </p>

                <div
                    style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        position: 'relative',
                    }}
                >
                    <Link
                        href="/get-started"
                        className="btn-primary"
                        style={{
                            fontSize: '1.1rem',
                            padding: '16px 36px',
                            textDecoration: 'none',
                        }}
                    >
                        Get Started Free <ArrowRight size={20} />
                    </Link>
                    <Link
                        href="/pricing"
                        style={{
                            padding: '16px 36px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        View Pricing
                    </Link>
                </div>
            </motion.div>
        </section>
    );
}
