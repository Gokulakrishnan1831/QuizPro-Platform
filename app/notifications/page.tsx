'use client';

import useSWR from 'swr';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/home/Footer';
import { Bell, Check, Clock, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NotificationsPage() {
    const { data, error, mutate } = useSWR('/api/notifications', fetcher, { refreshInterval: 5000 });
    const notifications = data?.notifications || [];
    const loading = !data && !error;
    const router = useRouter();

    const handleNotificationClick = async (notification: any) => {
        // Mark as read if not already read
        if (!notification.isRead) {
            try {
                await fetch(`/api/notifications/${notification.id}/read`, {
                    method: 'POST',
                });
                mutate(); // Optimistically update count and status locally
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
        // Redirect to the target link
        router.push(notification.linkUrl || '/feedback');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <Navbar />
            <div style={{ flex: 1, padding: '6rem 2rem 5rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '1rem', fontSize: '2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell color="var(--text-accent)" /> 
                    Notifications
                </h1>
                
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading notifications...</p>
                ) : notifications.length === 0 ? (
                    <div style={{ 
                        padding: '3rem', 
                        textAlign: 'center', 
                        background: 'var(--surface)', 
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)' 
                    }}>
                        <Bell size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                        <p>You're all caught up! No notifications yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <AnimatePresence>
                            {notifications.map((notif) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => handleNotificationClick(notif)}
                                    style={{
                                        padding: '1.5rem',
                                        background: notif.isRead ? 'var(--surface)' : 'rgba(99, 102, 241, 0.05)',
                                        border: '1px solid',
                                        borderColor: notif.isRead ? 'var(--border-color)' : 'rgba(99, 102, 241, 0.3)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        gap: '1rem',
                                        transition: 'transform 0.2s, background 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    <div style={{ 
                                        width: '40px', height: '40px', borderRadius: '50%', 
                                        background: 'var(--bg-secondary)', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        color: 'var(--text-accent)'
                                    }}>
                                        {notif.type === 'feedback_reply' ? <MessageCircle size={20} /> : <Bell size={20} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: notif.isRead ? 500 : 700 }}>
                                                {notif.title}
                                            </h3>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {notif.message}
                                        </p>
                                    </div>
                                    {!notif.isRead && (
                                        <div style={{ alignSelf: 'center', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
