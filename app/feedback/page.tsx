'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Plus, Send, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FeedbackPage() {
    const { data, error, mutate } = useSWR('/api/feedback', fetcher, { refreshInterval: 5000 });
    const feedbacks = data?.feedbacks || [];

    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('');
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedThread, setExpandedThread] = useState<string | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !category || !body) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, category, body })
            });

            if (res.ok) {
                setSubject('');
                setCategory('');
                setBody('');
                mutate(); // Optimistic refresh
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReply = async (threadId: string) => {
        if (!replyBody) return;
        setIsReplying(true);
        try {
            const res = await fetch(`/api/feedback/${threadId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: replyBody })
            });
            if (res.ok) {
                setReplyBody('');
                mutate();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsReplying(false);
        }
    };

    const toggleThread = (id: string) => {
        setExpandedThread(prev => (prev === id ? null : id));
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <Navbar />
            <div style={{ flex: 1, padding: '6rem 2rem 5rem', width: '100%' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'revert', gap: '2rem' }}>
                    <div style={{ width: '100%' }}>
                    <h1 style={{ marginBottom: '1rem', fontSize: '2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageCircle color="var(--text-accent)" /> 
                        Feedback & Support
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Have a feature request, found a bug, or need help? Send us a message and our admins will get back to you securely.
                    </p>

                    <div style={{
                        background: 'var(--surface)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '2rem',
                        marginBottom: '3rem'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Create New Ticket</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input 
                                    type="text" 
                                    placeholder="Subject" 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    style={{ flex: 2, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    required
                                />
                                <input 
                                    type="text" 
                                    placeholder="Category (e.g. Bug, Idea, Question)" 
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    required
                                />
                            </div>
                            <textarea
                                placeholder="Describe your issue or feedback in detail..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={4}
                                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}
                                required
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem',
                                        background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: isSubmitting ? 0.7 : 1
                                    }}
                                >
                                    <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Your Tickets</h2>
                    {error && <p style={{ color: 'red' }}>Failed to load tickets.</p>}
                    {!data && !error && <p style={{ color: 'var(--text-muted)' }}>Loading tickets...</p>}
                    {feedbacks.length === 0 && data && <p style={{ color: 'var(--text-muted)' }}>No feedback submitted yet.</p>}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <AnimatePresence>
                            {feedbacks.map((fb: any) => (
                                <motion.div 
                                    key={fb.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div 
                                        onClick={() => toggleThread(fb.id)}
                                        style={{ 
                                            padding: '1.5rem', cursor: 'pointer', display: 'flex', 
                                            justifyContent: 'space-between', alignItems: 'center',
                                            background: expandedThread === fb.id ? 'var(--hover-bg)' : 'transparent'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>{fb.subject}</h3>
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                    {fb.category}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                                                {fb.status === 'resolved' ? (
                                                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Resolved</span>
                                                ) : fb.status === 'in_progress' ? (
                                                    <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> In Progress</span>
                                                ) : (
                                                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> Open</span>
                                                )}
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {new Date(fb.createdAt?._seconds ? fb.createdAt._seconds * 1000 : fb.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        {expandedThread === fb.id ? <ChevronUp color="var(--text-muted)" /> : <ChevronDown color="var(--text-muted)" />}
                                    </div>
                                    
                                    {expandedThread === fb.id && (
                                        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--divider)', paddingTop: '1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {/* Original Message */}
                                                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', maxWidth: '80%' }}>
                                                    <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                        {fb.body}
                                                    </p>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>You</div>
                                                </div>

                                                {/* Replies */}
                                                {(fb.replies || []).map((reply: any) => {
                                                    const isAdmin = reply.authorRole === 'admin';
                                                    return (
                                                        <div key={reply.id} style={{ 
                                                            alignSelf: isAdmin ? 'flex-end' : 'flex-start', 
                                                            background: isAdmin ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)', 
                                                            border: isAdmin ? '1px solid rgba(99, 102, 241, 0.2)' : 'none',
                                                            padding: '1rem', borderRadius: '12px', maxWidth: '80%' 
                                                        }}>
                                                            <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                                {reply.body}
                                                            </p>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: isAdmin ? 'right' : 'left' }}>
                                                                {isAdmin ? 'Admin' : 'You'}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {fb.status !== 'resolved' && (
                                                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Add a follow-up reply..."
                                                        value={replyBody}
                                                        onChange={(e) => setReplyBody(e.target.value)}
                                                        style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                    />
                                                    <button 
                                                        onClick={() => handleReply(fb.id)}
                                                        disabled={isReplying || !replyBody}
                                                        style={{
                                                            padding: '0.75rem 1.5rem', background: 'var(--text-accent)', color: 'white', 
                                                            border: 'none', borderRadius: '8px', cursor: (isReplying || !replyBody) ? 'not-allowed' : 'pointer',
                                                            opacity: (isReplying || !replyBody) ? 0.7 : 1
                                                        }}
                                                    >
                                                        Reply
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
