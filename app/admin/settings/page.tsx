'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    QrCode,
    Save,
    Loader2,
    Trash2,
    IndianRupee,
    User,
} from 'lucide-react';
import { BRAND_NAME } from '@/lib/branding';

/* ─── Settings form ──────────────────────────────────────────── */

export default function AdminSettingsPage() {
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [upiId, setUpiId] = useState('');
    const [upiName, setUpiName] = useState('');
    const [saving, setSaving] = useState(false);
    const [loadingQr, setLoadingQr] = useState(true);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Load existing settings
    useEffect(() => {
        (async () => {
            try {
                // Fetch QR image
                const qrRes = await fetch('/api/admin/settings?key=upi_qr_image');
                const qrData = await qrRes.json();
                if (qrData.value && qrData.value !== '[image]') setQrImage(qrData.value);

                // Fetch UPI ID
                const idRes = await fetch('/api/admin/settings?key=upi_id');
                const idData = await idRes.json();
                setUpiId(idData.value ?? '');

                // Fetch UPI name
                const nameRes = await fetch('/api/admin/settings?key=upi_name');
                const nameData = await nameRes.json();
                setUpiName(nameData.value ?? '');
            } catch { }
            setLoadingQr(false);
        })();
    }, []);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // Handle file upload → convert to base64
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('error', 'Please upload a valid image file (PNG, JPG, or WebP)');
            return;
        }

        if (file.size > 500_000) {
            showToast('error', 'Image too large. Please use a file smaller than 500KB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setQrImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const saveSetting = async (key: string, value: string) => {
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
        if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || 'Save failed');
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const tasks: Promise<void>[] = [
                saveSetting('upi_id', upiId.trim()),
                saveSetting('upi_name', upiName.trim()),
            ];
            if (qrImage) {
                tasks.push(saveSetting('upi_qr_image', qrImage));
            }
            await Promise.all(tasks);
            showToast('success', 'Settings saved successfully!');
        } catch (err: any) {
            showToast('error', err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveQr = async () => {
        setQrImage(null);
        if (fileRef.current) fileRef.current.value = '';
        try {
            await saveSetting('upi_qr_image', '');
            showToast('success', 'QR image removed');
        } catch { }
    };

    return (
        <div>
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: '24px',
                        right: '24px',
                        zIndex: 999,
                        padding: '14px 20px',
                        borderRadius: '12px',
                        background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: toast.type === 'success' ? '#10b981' : '#ef4444',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                >
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                </motion.div>
            )}

            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                    Payment Settings
                </h1>
                <p style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>
                    Configure UPI payment details shown to users on the pricing page
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '900px' }}>
                {/* Left: QR Upload */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card"
                    style={{ padding: '2rem' }}
                >
                    <h2
                        style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <QrCode size={20} color="#a5b4fc" /> UPI QR Code
                    </h2>

                    {/* Drop zone */}
                    <div
                        onClick={() => fileRef.current?.click()}
                        style={{
                            border: '2px dashed rgba(99,102,241,0.3)',
                            borderRadius: '16px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                            marginBottom: '1.25rem',
                            minHeight: '180px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            background: 'rgba(99,102,241,0.02)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}
                    >
                        {loadingQr ? (
                            <Loader2
                                size={32}
                                color="#6b7280"
                                style={{ animation: 'spin 1s linear infinite' }}
                            />
                        ) : qrImage ? (
                            <img
                                src={qrImage}
                                alt="UPI QR Code"
                                style={{
                                    maxWidth: '200px',
                                    maxHeight: '200px',
                                    borderRadius: '8px',
                                    objectFit: 'contain',
                                }}
                            />
                        ) : (
                            <>
                                <div
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '14px',
                                        background: 'rgba(99,102,241,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Upload size={24} color="#6366f1" />
                                </div>
                                <div>
                                    <p style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                                        Click to upload QR image
                                    </p>
                                    <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                        PNG, JPG or WebP · max 500KB
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="btn-primary"
                            style={{ flex: 1, justifyContent: 'center', gap: '6px', padding: '10px' }}
                        >
                            <Upload size={16} />
                            {qrImage ? 'Replace Image' : 'Upload QR'}
                        </button>
                        {qrImage && (
                            <button
                                onClick={handleRemoveQr}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    background: 'rgba(239,68,68,0.06)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                }}
                                title="Remove QR image"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Right: UPI Details + Save */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h2
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <IndianRupee size={20} color="#10b981" /> UPI Details
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label
                                    style={{
                                        fontSize: '0.8rem',
                                        color: '#6b7280',
                                        display: 'block',
                                        marginBottom: '6px',
                                    }}
                                >
                                    UPI ID
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="yourname@upi"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                    style={{ fontSize: '0.95rem' }}
                                />
                            </div>

                            <div>
                                <label
                                    style={{
                                        fontSize: '0.8rem',
                                        color: '#6b7280',
                                        display: 'block',
                                        marginBottom: '6px',
                                    }}
                                >
                                    Display Name (shown to users)
                                </label>
                                <input
                                    className="input-field"
                                    placeholder={`${BRAND_NAME} by Gautam`}
                                    value={upiName}
                                    onChange={(e) => setUpiName(e.target.value)}
                                    style={{ fontSize: '0.95rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview card */}
                    <div
                        className="glass-card"
                        style={{
                            padding: '1.5rem',
                            background: 'rgba(16,185,129,0.04)',
                            border: '1px solid rgba(16,185,129,0.1)',
                        }}
                    >
                        <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '10px' }}>
                            Preview (shown on pricing page):
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <User size={32} color="#6b7280" style={{ flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: '700', color: 'white' }}>
                                    {upiName || BRAND_NAME}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#10b981' }}>
                                    {upiId || 'yourname@upi'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="btn-primary"
                        style={{ justifyContent: 'center', gap: '8px', padding: '14px' }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save All Settings
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
