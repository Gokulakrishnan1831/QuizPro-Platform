'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    Loader2,
    RefreshCw,
    IndianRupee,
    AlertCircle,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface PaymentRequest {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string | null;
    tier: string;
    amount: number;
    upi_transaction_id: string;
    screenshot_base64: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
}

/* ─── Status badge ───────────────────────────────────────────── */

const STATUS_CONFIG = {
    pending: { color: '#f59e0b', icon: <Clock size={14} />, label: 'Pending' },
    approved: { color: '#10b981', icon: <CheckCircle2 size={14} />, label: 'Approved' },
    rejected: { color: '#ef4444', icon: <XCircle size={14} />, label: 'Rejected' },
};

const TIER_COLOR: Record<string, string> = {
    BASIC: '#06b6d4',
    PRO: '#6366f1',
    ELITE: '#f59e0b',
};

/* ─── Detail Modal ───────────────────────────────────────────── */

function DetailModal({
    req,
    onClose,
    onAction,
}: {
    req: PaymentRequest;
    onClose: () => void;
    onAction: (id: string, action: 'approve' | 'reject', notes: string) => Promise<void>;
}) {
    const [notes, setNotes] = useState('');
    const [acting, setActing] = useState<'approve' | 'reject' | null>(null);

    const handle = async (action: 'approve' | 'reject') => {
        setActing(action);
        await onAction(req.id, action, notes);
        setActing(null);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: 'rgba(10,10,30,0.85)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                className="glass-card"
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <h3 style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                    Payment Request Details
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    {[
                        ['User', req.user_name || req.user_email],
                        ['Email', req.user_email],
                        ['Tier', req.tier],
                        ['Amount', `₹${req.amount}`],
                        ['UPI Transaction ID', req.upi_transaction_id],
                        ['Submitted', new Date(req.created_at).toLocaleString('en-IN')],
                        ['Status', req.status.toUpperCase()],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}
                        >
                            <span style={{ color: '#6b7280', fontSize: '0.85rem', flexShrink: 0 }}>{label}</span>
                            <span
                                style={{
                                    fontWeight: '600',
                                    color: label === 'Amount' ? '#10b981' : label === 'Tier' ? (TIER_COLOR[req.tier ?? ''] ?? 'white') : 'white',
                                    textAlign: 'right',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Screenshot */}
                {req.screenshot_base64 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>
                            Payment Screenshot:
                        </p>
                        <img
                            src={req.screenshot_base64}
                            alt="Payment screenshot"
                            style={{
                                width: '100%',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                maxHeight: '300px',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                )}

                {/* Admin notes */}
                {req.status === 'pending' && (
                    <>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label
                                style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '6px' }}
                            >
                                Admin Notes (optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Transaction verified, upgrading account…"
                                rows={3}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => handle('approve')}
                                disabled={!!acting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: acting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                }}
                            >
                                {acting === 'approve' ? (
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                Approve & Upgrade
                            </button>

                            <button
                                onClick={() => handle('reject')}
                                disabled={!!acting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    background: 'rgba(239,68,68,0.08)',
                                    color: '#ef4444',
                                    fontWeight: '700',
                                    cursor: acting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                }}
                            >
                                {acting === 'reject' ? (
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <XCircle size={16} />
                                )}
                                Reject
                            </button>
                        </div>
                    </>
                )}

                {req.status !== 'pending' && (
                    <div
                        style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: req.status === 'approved' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                            color: req.status === 'approved' ? '#10b981' : '#ef4444',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            textAlign: 'center',
                        }}
                    >
                        {req.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                        {req.admin_notes && ` — ${req.admin_notes}`}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function AdminPaymentsPage() {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [selected, setSelected] = useState<PaymentRequest | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const fetchRequests = useCallback(
        async (status = filter) => {
            setLoading(true);
            const res = await fetch(`/api/admin/payments?status=${status}`);
            const data = await res.json();
            setRequests(data.requests ?? []);
            setLoading(false);
        },
        [filter]
    );

    useEffect(() => {
        fetchRequests(filter);
    }, [filter, fetchRequests]);

    const handleAction = async (id: string, action: 'approve' | 'reject', notes: string) => {
        const res = await fetch('/api/admin/payments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: id, action, adminNotes: notes }),
        });
        const data = await res.json();
        if (res.ok) {
            setToast(action === 'approve' ? '✅ User upgraded successfully!' : '❌ Request rejected');
            await fetchRequests(filter);
        } else {
            setToast(`Error: ${data.error}`);
        }
        setTimeout(() => setToast(null), 4000);
    };

    const pendingCount = requests.filter((r) => r.status === 'pending').length;

    return (
        <div>
            <AnimatePresence>{selected && (
                <DetailModal
                    req={selected}
                    onClose={() => setSelected(null)}
                    onAction={handleAction}
                />
            )}</AnimatePresence>

            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'fixed',
                        top: '24px',
                        right: '24px',
                        zIndex: 999,
                        background: 'rgba(30,30,60,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: '600',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                >
                    {toast}
                </motion.div>
            )}

            <header
                style={{
                    marginBottom: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}
            >
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                        Payment Requests
                        {filter === 'pending' && pendingCount > 0 && (
                            <span
                                style={{
                                    marginLeft: '12px',
                                    background: '#f59e0b',
                                    color: '#0f0f23',
                                    borderRadius: '20px',
                                    padding: '3px 12px',
                                    fontSize: '0.9rem',
                                    fontWeight: '800',
                                    verticalAlign: 'middle',
                                }}
                            >
                                {pendingCount}
                            </span>
                        )}
                    </h1>
                    <p style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>
                        Review and approve UPI payment proofs
                    </p>
                </div>

                <button
                    onClick={() => fetchRequests(filter)}
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </header>

            {/* Filter tabs */}
            <div
                style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}
            >
                {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '20px',
                            border: `1px solid ${filter === s ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            background: filter === s ? 'rgba(99,102,241,0.12)' : 'transparent',
                            color: filter === s ? '#a5b4fc' : '#6b7280',
                            cursor: 'pointer',
                            fontWeight: filter === s ? '700' : '400',
                            fontSize: '0.88rem',
                            textTransform: 'capitalize',
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 80px',
                        padding: '12px 16px',
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: '600',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    {['User', 'Tier', 'Amount', 'Status', 'Submitted', 'Action'].map((h) => (
                        <span key={h}>{h}</span>
                    ))}
                </div>

                {loading ? (
                    <div
                        style={{
                            padding: '4rem',
                            textAlign: 'center',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                        }}
                    >
                        <Loader2 size={20} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                        Loading...
                    </div>
                ) : requests.length === 0 ? (
                    <div
                        style={{
                            padding: '4rem',
                            textAlign: 'center',
                            color: '#6b7280',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <IndianRupee size={40} color="#2d2d5e" />
                        <p>No {filter !== 'all' ? filter : ''} payment requests</p>
                    </div>
                ) : (
                    requests.map((r, i) => {
                        const sc = STATUS_CONFIG[r.status];
                        return (
                            <motion.div
                                key={r.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 80px',
                                    padding: '13px 16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    alignItems: 'center',
                                    fontSize: '0.85rem',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: '600', color: 'white' }}>
                                        {r.user_name || '—'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.user_email}</div>
                                </div>

                                <div>
                                    <span
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            background: `${TIER_COLOR[r.tier] ?? '#6b7280'}18`,
                                            color: TIER_COLOR[r.tier] ?? '#6b7280',
                                        }}
                                    >
                                        {r.tier}
                                    </span>
                                </div>

                                <div style={{ color: '#10b981', fontWeight: '700' }}>₹{r.amount}</div>

                                <div>
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.72rem',
                                            fontWeight: '700',
                                            background: `${sc.color}15`,
                                            color: sc.color,
                                        }}
                                    >
                                        {sc.icon} {sc.label}
                                    </span>
                                </div>

                                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                    {new Date(r.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>

                                <button
                                    onClick={() => setSelected(r)}
                                    style={{
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.78rem',
                                    }}
                                >
                                    <Eye size={14} /> View
                                </button>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
