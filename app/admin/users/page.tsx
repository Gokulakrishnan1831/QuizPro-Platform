'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Edit3,
    X,
    CheckCircle2,
    Loader2,
    Filter,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */

interface User {
    id: string;
    name: string | null;
    email: string;
    persona: string | null;
    subscriptionTier: string;
    quizzesRemaining: number;
    quizzesTaken: number;
    createdAt: string;
}

/* ─── Tier / persona constants ───────────────────────────────── */

const TIERS = ['FREE', 'BASIC', 'PRO', 'ELITE'];
const PERSONAS = ['FRESHER', 'SWITCHER', 'JOB_HOPPER'];

const TIER_COLOR: Record<string, string> = {
    FREE: '#6b7280',
    BASIC: '#06b6d4',
    PRO: '#6366f1',
    ELITE: '#f59e0b',
};

/* ─── Edit Modal ─────────────────────────────────────────────── */

function EditModal({
    user,
    onClose,
    onSaved,
}: {
    user: User;
    onClose: () => void;
    onSaved: (updated: Partial<User>) => void;
}) {
    const [tier, setTier] = useState(user.subscriptionTier);
    const [quotaStr, setQuotaStr] = useState(String(user.quizzesRemaining));
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setErr('');
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                subscriptionTier: tier,
                quizzesRemaining: parseInt(quotaStr, 10) || 0,
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setDone(true);
            onSaved({ subscriptionTier: tier, quizzesRemaining: parseInt(quotaStr, 10) });
            setTimeout(onClose, 1200);
        } else {
            setErr(data.error || 'Failed to save');
        }
        setSaving(false);
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
                background: 'rgba(10,10,30,0.8)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                    }}
                >
                    <h3 style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                        Edit User
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#a5b4fc' }}>
                    <strong>{user.name || user.email}</strong>
                    <span style={{ marginLeft: '8px', color: '#6b7280' }}>{user.email}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label
                            style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '6px' }}
                        >
                            Subscription Tier
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {TIERS.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTier(t)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: `1px solid ${tier === t ? TIER_COLOR[t] : 'rgba(255,255,255,0.1)'}`,
                                        background: tier === t ? `${TIER_COLOR[t]}18` : 'transparent',
                                        color: tier === t ? TIER_COLOR[t] : '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: '600',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label
                            style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '6px' }}
                        >
                            Quizzes Remaining
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={999}
                            value={quotaStr}
                            onChange={(e) => setQuotaStr(e.target.value)}
                            className="input-field"
                            style={{ fontSize: '1rem' }}
                        />
                    </div>

                    {err && (
                        <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{err}</div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving || done}
                        className="btn-primary"
                        style={{ justifyContent: 'center', marginTop: '0.5rem' }}
                    >
                        {done ? (
                            <>
                                <CheckCircle2 size={18} /> Saved!
                            </>
                        ) : saving ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState<User | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterTier, setFilterTier] = useState('');
    const [filterPersona, setFilterPersona] = useState('');

    const fetchUsers = useCallback(
        async (p = 1) => {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(p),
                limit: '20',
                ...(search && { q: search }),
                ...(filterTier && { tier: filterTier }),
                ...(filterPersona && { persona: filterPersona }),
            });
            try {
                const res = await fetch(`/api/admin/users?${params}`);
                const data = await res.json();
                setUsers(data.users ?? []);
                setTotal(data.total ?? 0);
                setPages(data.pages ?? 1);
                setPage(p);
            } finally {
                setLoading(false);
            }
        },
        [search, filterTier, filterPersona]
    );

    useEffect(() => {
        fetchUsers(1);
    }, [fetchUsers]);

    /* ── CSV Export ─────────────────────────────────────────────── */
    const exportCSV = async () => {
        // Fetch all users for export (no pagination)
        const params = new URLSearchParams({
            limit: '1000',
            ...(filterTier && { tier: filterTier }),
            ...(filterPersona && { persona: filterPersona }),
            ...(search && { q: search }),
        });
        const res = await fetch(`/api/admin/users?${params}`);
        const data = await res.json();
        const allUsers: User[] = data.users ?? [];

        // Dynamically import PapaParse
        const Papa = (await import('papaparse')).default;
        const csv = Papa.unparse(
            allUsers.map((u) => ({
                ID: u.id,
                Name: u.name ?? '',
                Email: u.email,
                Persona: u.persona ?? '',
                Tier: u.subscriptionTier,
                'Quizzes Remaining': u.quizzesRemaining,
                'Quizzes Taken': u.quizzesTaken,
                Joined: new Date(u.createdAt).toLocaleDateString('en-IN'),
            }))
        );
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `preplytics-users-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUserEdit = (updated: Partial<User>) => {
        if (!editUser) return;
        setUsers((prev) =>
            prev.map((u) => (u.id === editUser.id ? { ...u, ...updated } : u))
        );
    };

    return (
        <div>
            {/* Edit Modal */}
            <AnimatePresence>
                {editUser && (
                    <EditModal
                        user={editUser}
                        onClose={() => setEditUser(null)}
                        onSaved={handleUserEdit}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
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
                        User Management
                    </h1>
                    <p style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>
                        {total} total users
                    </p>
                </div>
                <button
                    onClick={exportCSV}
                    className="btn-primary"
                    style={{ gap: '8px', padding: '10px 18px' }}
                >
                    <Download size={18} /> Export CSV
                </button>
            </header>

            {/* Filters */}
            <div
                className="glass-card"
                style={{
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#6b7280',
                        }}
                    />
                    <input
                        className="input-field"
                        placeholder="Search name or email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
                    />
                </div>

                <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="input-field"
                    style={{ flex: '0 1 140px', fontSize: '0.88rem', backgroundColor: '#1a1a2e', color: '#e2e8f0' }}
                >
                    <option value="" style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>All Tiers</option>
                    {TIERS.map((t) => (
                        <option key={t} value={t} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>
                            {t}
                        </option>
                    ))}
                </select>

                <select
                    value={filterPersona}
                    onChange={(e) => setFilterPersona(e.target.value)}
                    className="input-field"
                    style={{ flex: '0 1 160px', fontSize: '0.88rem', backgroundColor: '#1a1a2e', color: '#e2e8f0' }}
                >
                    <option value="" style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>All Personas</option>
                    {PERSONAS.map((p) => (
                        <option key={p} value={p} style={{ backgroundColor: '#1a1a2e', color: '#e2e8f0' }}>
                            {p}
                        </option>
                    ))}
                </select>

                {(filterTier || filterPersona || search) && (
                    <button
                        onClick={() => {
                            setSearch('');
                            setFilterTier('');
                            setFilterPersona('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.82rem',
                        }}
                    >
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1fr 90px 90px 80px 50px',
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: '600',
                    }}
                >
                    {['User', 'Persona', 'Tier', 'Remaining', 'Taken', 'Joined', ''].map(
                        (h) => (
                            <span key={h}>{h}</span>
                        )
                    )}
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
                        <Loader2
                            size={20}
                            color="#6366f1"
                            style={{ animation: 'spin 1s linear infinite' }}
                        />
                        Loading users...
                    </div>
                ) : users.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
                        No users found.
                    </div>
                ) : (
                    users.map((u, i) => (
                        <motion.div
                            key={u.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.2fr 1fr 90px 90px 80px 50px',
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                alignItems: 'center',
                                fontSize: '0.85rem',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: '600', color: 'white' }}>
                                    {u.name || '—'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {u.email}
                                </div>
                            </div>

                            <div style={{ color: '#a5b4fc' }}>{u.persona ?? '—'}</div>

                            <div>
                                <span
                                    style={{
                                        padding: '3px 9px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        background: `${TIER_COLOR[u.subscriptionTier] ?? '#6b7280'}18`,
                                        color: TIER_COLOR[u.subscriptionTier] ?? '#6b7280',
                                    }}
                                >
                                    {u.subscriptionTier}
                                </span>
                            </div>

                            <div
                                style={{
                                    color: u.quizzesRemaining === 0 ? '#ef4444' : '#10b981',
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }}
                            >
                                {u.quizzesRemaining}
                            </div>

                            <div style={{ textAlign: 'center', color: '#a5b4fc' }}>
                                {u.quizzesTaken}
                            </div>

                            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                })}
                            </div>

                            <button
                                onClick={() => setEditUser(u)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6366f1',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    transition: 'background 0.15s',
                                }}
                                title="Edit user"
                            >
                                <Edit3 size={16} />
                            </button>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.75rem',
                    }}
                >
                    <button
                        onClick={() => fetchUsers(page - 1)}
                        disabled={page === 1 || loading}
                        style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                            opacity: page === 1 ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <ChevronLeft size={16} /> Prev
                    </button>

                    <span style={{ color: '#a5b4fc', fontSize: '0.88rem' }}>
                        Page {page} of {pages}
                    </span>

                    <button
                        onClick={() => fetchUsers(page + 1)}
                        disabled={page === pages || loading}
                        style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            cursor: page === pages ? 'not-allowed' : 'pointer',
                            opacity: page === pages ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
