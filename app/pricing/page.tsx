'use client';

import { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Zap,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Crown,
  Sparkles,
  QrCode,
  Copy,
  Upload,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { track } from '@/lib/analytics';

/* ─── Plan definitions ───────────────────────────────────────── */

const TIERS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    quizzes: 1,
    isPopular: false,
    color: '#6b7280',
    icon: '🎯',
    description: 'Try before you commit',
    features: [
      '1 AI-generated quiz',
      'MCQ questions only',
      'Basic score report',
      'Skill accuracy breakdown',
    ],
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: 99,
    quizzes: 3,
    isPopular: false,
    color: '#06b6d4',
    icon: '📚',
    description: 'Start your prep journey',
    features: [
      '3 AI-generated quizzes',
      'Practice & Interview Prep modes',
      'Detailed score reports with AI focus topics',
      'AI performance summary',
      'Segmented leaderboard access',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 299,
    quizzes: 10,
    isPopular: true,
    color: '#6366f1',
    icon: '🚀',
    description: 'Most popular — full experience',
    features: [
      '10 AI-generated quizzes',
      'Hands-on SQL & Excel questions',
      'Company-specific interview prep (JD-tailored)',
      'AI improvement roadmap & focus topics',
      'Per-skill leaderboard ranking',
      'Priority support',
    ],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 499,
    quizzes: 20,
    isPopular: false,
    color: '#f59e0b',
    icon: '👑',
    description: 'For serious job seekers',
    features: [
      '20 AI-generated quizzes',
      'Everything in Pro',
      'Company interview pattern analysis',
      'Unlimited quiz retries',
      'Resume upload & analysis',
      'Personalized mentorship access',
    ],
  },
];

/* ─── UPI Payment Modal ──────────────────────────────────────── */

function UpiModal({
  tier,
  onClose,
  onSuccess,
}: {
  tier: (typeof TIERS)[number];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [upiData, setUpiData] = useState<{
    qrImage: string | null;
    upiId: string | null;
    upiName: string | null;
  }>({ qrImage: null, upiId: null, upiName: null });
  const [step, setStep] = useState<'qr' | 'confirm' | 'done'>('qr');
  const [txnId, setTxnId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/subscriptions/upi-qr')
      .then((r) => r.json())
      .then(setUpiData)
      .catch(() => { });
  }, []);

  const handleCopyUpiId = () => {
    if (upiData.upiId) {
      navigator.clipboard.writeText(upiData.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!txnId.trim() || txnId.trim().length < 6) {
      setError('Please enter a valid UPI transaction ID (min 6 characters)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.id,
          upiTransactionId: txnId.trim(),
          screenshotBase64: screenshot,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        void track('payment_requested', { tier: tier.id, amount: tier.price });
        setStep('done');
      } else {
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
        background: 'rgba(10,10,30,0.88)',
        backdropFilter: 'blur(8px)',
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
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(20,20,48,0.98)',
          border: `1px solid ${tier.color}30`,
          borderRadius: '20px',
          padding: '2rem',
          position: 'relative',
          boxShadow: `0 0 80px ${tier.color}18`,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Done state */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <CheckCircle2 size={64} color="#10b981" />
            </div>
            <h2 style={{ fontWeight: '800', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              Payment Submitted!
            </h2>
            <p style={{ color: '#a5b4fc', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Your payment request has been sent to the admin. Your account will be upgraded to{' '}
              <strong style={{ color: tier.color }}>{tier.name}</strong> within{' '}
              <strong>24 hours</strong> after verification.
            </p>
            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#6b7280',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              You'll receive access automatically once approved. Check back soon!
            </div>
            <button onClick={onSuccess} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Got it
            </button>
          </div>
        )}

        {/* Step 1: Show QR */}
        {step === 'qr' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tier.icon}</div>
              <h2 style={{ fontWeight: '800', fontSize: '1.3rem', marginBottom: '0.3rem' }}>
                Upgrade to {tier.name}
              </h2>
              <p style={{ color: tier.color, fontWeight: '900', fontSize: '1.8rem' }}>
                ₹{tier.price}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>One-time payment</p>
            </div>

            {/* QR Code */}
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '1.25rem',
              }}
            >
              {upiData.qrImage ? (
                <img
                  src={upiData.qrImage}
                  alt="UPI QR Code"
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    gap: '8px',
                  }}
                >
                  <QrCode size={48} />
                  <span style={{ fontSize: '0.8rem' }}>QR not configured yet</span>
                </div>
              )}
            </div>

            {/* UPI ID */}
            {upiData.upiId && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '1.25rem',
                  cursor: 'pointer',
                }}
                onClick={handleCopyUpiId}
                title="Click to copy UPI ID"
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '2px' }}>
                    UPI ID
                  </div>
                  <div style={{ fontWeight: '700', color: 'white' }}>{upiData.upiId}</div>
                  {upiData.upiName && (
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{upiData.upiName}</div>
                  )}
                </div>
                <div style={{ color: copied ? '#10b981' : '#6b7280' }}>
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </div>
              </div>
            )}

            <div
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#d97706',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              ⚠️ Please pay exactly <strong>₹{tier.price}</strong> and note down your UPI Transaction ID. You'll need it in the next step.
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              I've Paid → Enter Transaction ID
            </button>
          </>
        )}

        {/* Step 2: Confirm payment */}
        {step === 'confirm' && (
          <>
            <h2 style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Confirm Your Payment
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Enter the UPI transaction ID from your payment app's history.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                  UPI Transaction ID *
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. 407721234567 or T2401021234..."
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  style={{ fontSize: '0.95rem' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                  Found in your UPI app under payment history/receipts
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                  Payment Screenshot (optional, helps faster verification)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(99,102,241,0.25)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {screenshot ? (
                    <img
                      src={screenshot}
                      alt="screenshot"
                      style={{ maxHeight: '140px', borderRadius: '8px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ color: '#6b7280', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Upload size={22} color="#6366f1" />
                      Click to upload screenshot
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleScreenshot}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.06)',
                  borderRadius: '8px',
                }}
              >
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setStep('qr')}
                style={{
                  flex: 0,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'none',
                  color: '#a5b4fc',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', gap: '8px' }}
              >
                {submitting ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                ) : (
                  <>Submit Payment Request <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Pricing Page ───────────────────────────────────────────── */

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentTier, setCurrentTier] = useState<string>('FREE');
  const [selectedTier, setSelectedTier] = useState<(typeof TIERS)[number] | null>(null);
  const [successTier, setSuccessTier] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      setUser(currentUser);
      if (currentUser) {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        const apiTier = data.subscriptionTier ?? 'FREE';
        setCurrentTier(apiTier);

        // Auto-open modal if ?plan=X is in URL
        const params = new URLSearchParams(window.location.search);
        const paramPlan = params.get('plan')?.toUpperCase();
        if (paramPlan && paramPlan !== apiTier) {
          const matched = TIERS.find(t => t.id === paramPlan);
          if (matched && matched.price > 0) {
            setSelectedTier(matched);
            // clean up URL to prevent auto-opening again on refresh
            window.history.replaceState({}, '', '/pricing');
          }
        }
      }
    });
  }, []);

  const handleUpgrade = (tier: (typeof TIERS)[number]) => {
    if (!user) {
      sessionStorage.setItem('afterLogin', '/pricing');
      router.push('/login');
      return;
    }
    if (tier.price === 0 || tier.id === currentTier) return;
    void track('upgrade_clicked', { tier: tier.id });
    setSelectedTier(tier);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      <AnimatePresence>
        {selectedTier && (
          <UpiModal
            tier={selectedTier}
            onClose={() => setSelectedTier(null)}
            onSuccess={() => {
              setSuccessTier(selectedTier.id);
              setSelectedTier(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Success notice banner */}
      <AnimatePresence>
        {successTier && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            style={{
              position: 'fixed',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 150,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#10b981',
              padding: '14px 24px',
              borderRadius: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 32px rgba(16,185,129,0.15)',
            }}
          >
            <CheckCircle2 size={20} />
            Payment request submitted! Admin will verify and upgrade your account within 24 hours.
            <button
              onClick={() => setSuccessTier(null)}
              style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', marginLeft: '8px' }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem 5rem' }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '20px',
              fontSize: '0.85rem',
              color: '#a5b4fc',
              marginBottom: '1.5rem',
            }}
          >
            <Sparkles size={16} /> Simple, transparent pricing · Pay once via UPI
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: '900',
              marginBottom: '1rem',
              lineHeight: 1.15,
            }}
          >
            Invest in your{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              data career
            </span>
          </h1>

          <p style={{ color: '#a5b4fc', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto' }}>
            One-time UPI payment · No subscriptions · No auto-renewals · Just results.
          </p>
        </motion.div>

        {/* Plans grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '4rem',
          }}
        >
          {TIERS.map((tier, i) => {
            const isCurrentTier = currentTier === tier.id;
            const isFree = tier.price === 0;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  position: 'relative',
                  borderRadius: '20px',
                  padding: tier.isPopular ? '0' : '0',
                  background: tier.isPopular
                    ? `linear-gradient(135deg, ${tier.color}22, transparent)`
                    : 'transparent',
                }}
              >
                {tier.isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: tier.color,
                      color: '#0f0f23',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Star size={12} fill="currentColor" /> MOST POPULAR
                  </div>
                )}

                <div
                  style={{
                    height: '100%',
                    background: 'rgba(20,20,50,0.7)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isCurrentTier ? tier.color : tier.isPopular ? `${tier.color}40` : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '20px',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: tier.isPopular ? `0 0 40px ${tier.color}12` : 'none',
                  }}
                >
                  {/* Header */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{tier.icon}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'white' }}>
                        {tier.name}
                      </h3>
                      {isCurrentTier && (
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: '10px',
                            background: `${tier.color}20`,
                            color: tier.color,
                            fontSize: '0.7rem',
                            fontWeight: '700',
                          }}
                        >
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>{tier.description}</p>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: '900', color: tier.color }}>
                        {isFree ? 'Free' : `₹${tier.price}`}
                      </span>
                      {!isFree && (
                        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>one-time</span>
                      )}
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>
                      {tier.quizzes} quiz{tier.quizzes !== 1 ? 'zes' : ''}
                    </p>
                  </div>

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', flex: 1 }}>
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          marginBottom: '10px',
                          fontSize: '0.88rem',
                          color: '#e2e8f0',
                        }}
                      >
                        <Check
                          size={16}
                          style={{ color: tier.color, flexShrink: 0, marginTop: '2px' }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isCurrentTier}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '12px',
                      border: isFree || isCurrentTier
                        ? `1px solid rgba(255,255,255,0.1)`
                        : 'none',
                      background: isFree || isCurrentTier
                        ? 'rgba(255,255,255,0.04)'
                        : `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
                      color: isCurrentTier ? '#6b7280' : 'white',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      cursor: isCurrentTier ? 'not-allowed' : isFree ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: !isFree && !isCurrentTier
                        ? `0 4px 20px ${tier.color}30`
                        : 'none',
                    }}
                  >
                    {isCurrentTier ? (
                      <><CheckCircle2 size={16} /> Current Plan</>
                    ) : isFree ? (
                      <>Get Started Free <ArrowRight size={16} /></>
                    ) : (
                      <>Pay ₹{tier.price} via UPI <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* How it works section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.12)',
            borderRadius: '20px',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>
            How UPI Payment Works
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Simple, instant, and verified within 24 hours
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[
              { step: '1', label: 'Click Upgrade', desc: 'Select your plan and click Pay via UPI', icon: '👆' },
              { step: '2', label: 'Scan & Pay', desc: 'Scan the QR or use the UPI ID to pay', icon: '📱' },
              { step: '3', label: 'Share TXN ID', desc: 'Enter your UPI transaction ID from your payment app', icon: '🔢' },
              { step: '4', label: 'Get Upgraded', desc: 'Admin verifies & upgrades your account within 24hrs', icon: '🚀' },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <div style={{ fontWeight: '700', marginBottom: '0.35rem', color: 'white' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
