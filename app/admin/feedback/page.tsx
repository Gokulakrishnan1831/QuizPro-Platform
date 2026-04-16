'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Send, CheckCircle, Clock, Plus, Search, Filter } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminFeedbackPage() {
    const [statusFilter, setStatusFilter] = useState('all');
    const { data, error, mutate } = useSWR(`/api/admin/feedback?status=${statusFilter}`, fetcher, { refreshInterval: 5000 });
    const feedbacks = data?.feedbacks || [];

    const [selectedThread, setSelectedThread] = useState<any | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSelectThread = async (thread: any) => {
        setSelectedThread(thread);
        if (!thread.isReadByAdmin) {
            // Mark as read
            await fetch(`/api/admin/feedback/${thread.id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isReadByAdmin: true })
            });
            mutate();
        }
    };

    const handleReply = async () => {
        if (!replyBody || !selectedThread) return;
        setIsReplying(true);
        try {
            const res = await fetch(`/api/feedback/${selectedThread.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: replyBody })
            });
            if (res.ok) {
                const { reply } = await res.json();
                setSelectedThread({
                    ...selectedThread,
                    replies: [...(selectedThread.replies || []), reply],
                    status: 'in_progress'
                });
                setReplyBody('');
                mutate();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsReplying(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!selectedThread) return;
        try {
            await fetch(`/api/admin/feedback/${selectedThread.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            setSelectedThread({ ...selectedThread, status });
            mutate();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'grid', gridTemplateColumns: '350px 1fr', background: 'var(--bg-primary)' }}>
            
            {/* Left Sidebar - Thread List */}
            <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Inbox</h2>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                        {['all', 'open', 'in_progress', 'resolved'].map(filter => (
                            <button 
                                key={filter}
                                onClick={() => { setStatusFilter(filter); setSelectedThread(null); }}
                                style={{
                                    padding: '6px 12px', borderRadius: '20px', border: 'none',
                                    fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                                    background: statusFilter === filter ? 'var(--text-accent)' : 'var(--bg-secondary)',
                                    color: statusFilter === filter ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                {filter.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {error && <div style={{ padding: '1rem' }}>Error loading data.</div>}
                    {!data && !error && <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading...</div>}
                    {feedbacks.length === 0 && data && <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No threads found.</div>}
                    
                    {feedbacks.map((fb: any) => (
                        <div 
                            key={fb.id}
                            onClick={() => handleSelectThread(fb)}
                            style={{ 
                                padding: '1.25rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                                background: selectedThread?.id === fb.id ? 'var(--hover-bg)' : 'transparent',
                                position: 'relative'
                            }}
                        >
                            {!fb.isReadByAdmin && (
                                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                            )}
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{fb.userName}</div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1rem', paddingRight: '1rem' }}>
                                {fb.subject}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{fb.category}</span>
                                <span style={{ color: fb.status === 'resolved' ? '#10b981' : fb.status === 'in_progress' ? '#3b82f6' : '#f59e0b', textTransform: 'capitalize' }}>
                                    {fb.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Pane - Thread Detail */}
            {selectedThread ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)', opacity: 0.8 }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>{selectedThread.subject}</h2>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>From: {selectedThread.userEmail}</div>
                        </div>
                        <select 
                            value={selectedThread.status}
                            onChange={(e) => updateStatus(e.target.value)}
                            style={{ 
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                                background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>

                    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ alignSelf: 'flex-start', background: 'var(--surface)', border: '1px solid var(--border-color)', padding: '1rem 1.5rem', borderRadius: '12px', maxWidth: '80%' }}>
                            <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {selectedThread.body}
                            </p>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{selectedThread.userName}</div>
                        </div>

                        {(selectedThread.replies || []).map((reply: any) => {
                            const isAdmin = reply.authorRole === 'admin';
                            return (
                                <div key={reply.id} style={{ 
                                    alignSelf: isAdmin ? 'flex-end' : 'flex-start', 
                                    background: isAdmin ? 'var(--text-accent)' : 'var(--surface)', 
                                    border: isAdmin ? 'none' : '1px solid var(--border-color)',
                                    color: isAdmin ? 'white' : 'var(--text-primary)',
                                    padding: '1rem 1.5rem', borderRadius: '12px', maxWidth: '80%' 
                                }}>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                        {reply.body}
                                    </p>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem', textAlign: isAdmin ? 'right' : 'left' }}>
                                        {isAdmin ? 'You' : reply.authorName}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <textarea 
                                placeholder="Type your reply here... (Will email user automatically)"
                                value={replyBody}
                                onChange={(e) => setReplyBody(e.target.value)}
                                rows={3}
                                style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'none', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button 
                                onClick={handleReply}
                                disabled={isReplying || !replyBody}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem',
                                    background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px',
                                    cursor: (isReplying || !replyBody) ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: (isReplying || !replyBody) ? 0.7 : 1
                                }}
                            >
                                <Send size={16} /> {isReplying ? 'Sending...' : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    Select a thread to view details
                </div>
            )}
        </div>
    );
}
