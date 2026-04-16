'use client';

import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NotificationButton() {
    const { data } = useSWR('/api/notifications', fetcher, { refreshInterval: 5000 });
    const notifications = data?.notifications || [];
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    const router = useRouter();

    return (
        <button
            onClick={() => router.push('/notifications')}
            style={{
                position: 'relative',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                color: 'var(--text-primary)',
                transition: 'all 0.2s',
                borderRadius: '50%'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Notifications"
        >
            <Bell size={20} />
            <AnimatePresence>
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            border: '2px solid var(--nav-bg)',
                            borderRadius: '10px',
                            padding: '0 4px',
                            minWidth: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}
