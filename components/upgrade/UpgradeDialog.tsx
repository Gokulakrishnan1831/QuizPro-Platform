'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Lock,
  Star,
  Zap,
  Loader2,
  ArrowRight,
  Crown,
  Users,
} from 'lucide-react';
import { PLANS, getUpgradePlans, type Plan } from '@/lib/plans';

const REMIND_KEY = 'preplytics_upgrade_remind_until';

/* ─── Feature comparison row ────────────────────────────────── */

const ALL_COMPARE_FEATURES = [
  { label: 'AI-generated quizzes', tiers: { FREE: '1', BASIC: '3', PRO: '10', ELITE: '20' } },
  { label: 'MCQ questions', tiers: { FREE: true, BASIC: true, PRO: true, ELITE: true } },
  { label: 'Practice mode', tiers: { FREE: true, BASIC: true, PRO: true, ELITE: true } },
  { label: 'Detailed Skill Gap Reports', tiers: { FREE: false, BASIC: true, PRO: true, ELITE: true } },
  { label: 'AI performance summary', tiers: { FREE: false, BASIC: true, PRO: true, ELITE: true } },
  { label: 'Leaderboard access', tiers: { FREE: false, BASIC: true, PRO: true, ELITE: true } },
  { label: 'Hands-on SQL & Excel', tiers: { FREE: false, BASIC: false, PRO: true, ELITE: true } },
  { label: 'Interview Prep (JD-tailored)', tiers: { FREE: false, BASIC: false, PRO: true, ELITE: true } },
  { label: 'Per-skill leaderboard ranking', tiers: { FREE: false, BASIC: false, PRO: true, ELITE: true } },
  { label: 'Priority support', tiers: { FREE: false, BASIC: false, PRO: true, ELITE: true } },
  { label: 'Company interview pattern analysis', tiers: { FREE: false, BASIC: false, PRO: false, ELITE: true } },
  { label: 'Unlimited quiz retries', tiers: { FREE: false, BASIC: false, PRO: false, ELITE: true } },
  { label: '1-on-1 mentorship session', tiers: { FREE: false, BASIC: false, PRO: false, ELITE: true } },
] as const;

function CellValue({ value, color }: { value: boolean | string; color: string }) {
  if (typeof value === 'string') {
    return <span style={{ fontWeight: '700', color }}>{value}</span>;
  }
  if (value) {
    return <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />;
  }
  return <X size={14} style={{ color: '#4b5563', flexShrink: 0 }} />;
}

/* ─── Single upgrade plan card ──────────────────────────────── */

function PlanCard({
  plan,
  onUpgrade,
  loading,
}: {
  plan: Plan;
  onUpgrade: (plan: Plan) => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        minWidth: '200px',
        background: plan.isPopular
          ? `linear-gradient(160deg, ${plan.color}18, transparent)`
          : 'var(--card-bg)',
        border: `1.5px solid ${plan.isPopular ? plan.color : 'var(--border-color)'}`,
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: plan.isPopular ? `0 0 32px ${plan.color}20` : 'none',
      }}
    >
      {plan.isPopular && (
        <div
          style={{
            position: 'absolute',
            top: '-13px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: plan.color,
            color: '#fff',
            padding: '3px 14px',
            borderRadius: '20px',
            fontSize: '0.68rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <Star size={11} fill="white" /> MOST POPULAR
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{plan.icon}</div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {plan.name}
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{plan.description}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px' }}>
          <span style={{ fontSize: '2rem', fontWeight: '900', color: plan.color }}>₹{plan.price}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>one-time</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {plan.quizzes} quizzes included
        </p>
      </div>

      {/* Feature bullets */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', flex: 1 }}>
        {plan.features.slice(0, 5).map((feature) => (
          <li
            key={feature.label}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '7px',
              fontSize: '0.8rem',
              color: feature.available ? 'var(--text-secondary)' : 'var(--text-muted)',
              opacity: feature.available ? 1 : 0.5,
            }}
          >
            {feature.available
              ? <Check size={13} style={{ color: plan.color, flexShrink: 0, marginTop: '2px' }} />
              : <X size={13} style={{ color: '#4b5563', flexShrink: 0, marginTop: '2px' }} />
            }
            {feature.label}
          </li>
        ))}
        {plan.id === 'ELITE' && (
          <li
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '7px',
              fontSize: '0.8rem',
              color: plan.color,
              fontWeight: '600',
            }}
          >
            <Users size={13} style={{ color: plan.color, flexShrink: 0, marginTop: '2px' }} />
            1-on-1 Mentorship Session
          </li>
        )}
      </ul>

      {/* CTA */}
      <button
        onClick={() => onUpgrade(plan)}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          border: 'none',
          background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
          color: '#fff',
          fontWeight: '700',
          fontSize: '0.9rem',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          boxShadow: `0 4px 18px ${plan.color}30`,
          transition: 'opacity 0.2s',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
        ) : (
          <><Zap size={15} fill="white" /> Upgrade Now <ArrowRight size={14} /></>
        )}
      </button>
    </motion.div>
  );
}

/* ─── Main Dialog ────────────────────────────────────────────── */

interface UpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  lockedFeature?: string;
}

export function UpgradeDialog({ isOpen, onClose, currentTier, lockedFeature }: UpgradeDialogProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  const upgradePlans = getUpgradePlans(currentTier);

  const handleUpgrade = useCallback(async (plan: Plan) => {
    setLoadingTier(plan.id);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/cashfree-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: plan.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.paymentSessionId) {
        setError(data.error ?? 'Failed to initiate payment. Please try again.');
        setLoadingTier(null);
        return;
      }

      // Load Cashfree JS SDK and open payment
      const cashfreeEnv = process.env.NEXT_PUBLIC_CASHFREE_ENV ?? 'production';
      const { load } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await load({ mode: cashfreeEnv as 'production' | 'sandbox' });

      onClose(); // close dialog before redirecting

      await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_self',
      });
    } catch (err: any) {
      setError(err?.message ?? 'Payment initiation failed. Please try again.');
      setLoadingTier(null);
    }
  }, [onClose]);

  const handleRemindLater = () => {
    // Suppress for 24 hours
    sessionStorage.setItem(REMIND_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    onClose();
  };

  const currentPlan = PLANS.find((p) => p.id === currentTier);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="upgrade-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            background: 'rgba(5, 5, 20, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <motion.div
            key="upgrade-dialog-card"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            style={{
              width: '100%',
              maxWidth: '900px',
              background: 'var(--dropdown-bg)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '24px',
              padding: '2.5rem',
              position: 'relative',
              boxShadow: '0 0 80px rgba(99,102,241,0.12), 0 32px 64px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'var(--subtle-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  color: 'var(--text-accent)',
                  marginBottom: '1rem',
                }}
              >
                <Crown size={14} color="#f59e0b" />
                You&apos;re on the <strong style={{ color: currentPlan?.color }}>{currentPlan?.name ?? currentTier}</strong> plan
              </div>

              {lockedFeature ? (
                <>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 14px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      color: '#f87171',
                      marginBottom: '1rem',
                    }}
                  >
                    <Lock size={13} /> <strong>{lockedFeature}</strong> requires a higher plan
                  </div>
                  <br />
                </>
              ) : null}

              <h2
                style={{
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  fontWeight: '900',
                  marginBottom: '0.5rem',
                  lineHeight: 1.2,
                }}
              >
                Unlock your full potential{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  with Preplytics
                </span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                One-time payment · No subscriptions · Instant upgrade
              </p>
            </div>

            {/* Plan cards */}
            {upgradePlans.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                You&apos;re already on the highest plan! 🎉
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: '1.5rem',
                  justifyContent: 'center',
                }}
              >
                {upgradePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onUpgrade={handleUpgrade}
                    loading={loadingTier === plan.id}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '10px',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {/* Feature comparison toggle */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <button
                onClick={() => setShowTable((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-accent)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                {showTable ? '▲ Hide' : '▼ See'} full feature comparison
              </button>
            </div>

            {/* Feature comparison table */}
            <AnimatePresence>
              {showTable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginBottom: '1.5rem' }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        fontSize: '0.82rem',
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '10px 14px',
                              color: 'var(--text-muted)',
                              fontWeight: '600',
                              borderBottom: '1px solid var(--border-color)',
                              minWidth: '180px',
                            }}
                          >
                            Feature
                          </th>
                          {PLANS.map((p) => (
                            <th
                              key={p.id}
                              style={{
                                textAlign: 'center',
                                padding: '10px 14px',
                                color: p.id === currentTier ? 'var(--text-muted)' : p.color,
                                fontWeight: '800',
                                borderBottom: '1px solid var(--border-color)',
                                opacity: p.id === currentTier ? 0.5 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.icon} {p.name}
                              {p.id === currentTier && (
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: '0.65rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: '500',
                                  }}
                                >
                                  current
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ALL_COMPARE_FEATURES.map((row, idx) => (
                          <tr
                            key={row.label}
                            style={{
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                            }}
                          >
                            <td
                              style={{
                                padding: '9px 14px',
                                color: 'var(--text-secondary)',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              {row.label}
                            </td>
                            {PLANS.map((p) => {
                              const val = (row.tiers as any)[p.id];
                              return (
                                <td
                                  key={p.id}
                                  style={{
                                    textAlign: 'center',
                                    padding: '9px 14px',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    opacity: p.id === currentTier ? 0.5 : 1,
                                    display: 'table-cell',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <CellValue value={val} color={p.color} />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
                paddingTop: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={handleRemindLater}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  padding: '6px',
                }}
              >
                Remind me later
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                🔒 Secured by Cashfree · ₹0 refund risk · One-time only
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
