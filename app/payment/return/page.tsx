'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { getPlanById } from '@/lib/plans';

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id') ?? '';
  const tier = searchParams.get('tier')?.toUpperCase() ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');

  const plan = getPlanById(tier);

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      return;
    }

    // Poll our backend to verify order status
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/subscriptions/cashfree-status?order_id=${orderId}`);
        const data = await res.json();
        if (data.status === 'PAID') {
          setStatus('success');
        } else if (data.status === 'ACTIVE' || data.status === 'PENDING') {
          setStatus('pending');
        } else {
          setStatus('failed');
        }
      } catch {
        setStatus('failed');
      }
    };

    checkStatus();
  }, [orderId]);

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Navbar />
      <main
        style={{
          maxWidth: '520px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 size={64} style={{ animation: 'spin 1s linear infinite', color: '#6366f1', marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.75rem' }}>
              Verifying payment…
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Please wait while we confirm your payment.</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle2 size={80} color="#10b981" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.75rem' }}>
              Payment Successful! 🎉
            </h1>
            <p style={{ color: 'var(--text-accent)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
              You&apos;ve been upgraded to{' '}
              <strong style={{ color: plan?.color }}>{plan?.name ?? tier}</strong>!
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Your account now has access to all {plan?.name} features including {plan?.quizzes} quizzes.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary"
              style={{ justifyContent: 'center', gap: '8px', padding: '14px 28px', fontSize: '1rem' }}
            >
              Go to Dashboard <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {status === 'pending' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.25rem' }}>⏳</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.75rem' }}>
              Payment Processing
            </h1>
            <p style={{ color: 'var(--text-accent)', marginBottom: '0.5rem' }}>
              Your payment is being processed. This usually takes a few seconds.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Your account will be upgraded automatically once the payment is confirmed. Please refresh your dashboard in a moment.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary"
              style={{ justifyContent: 'center', gap: '8px', padding: '14px 28px', fontSize: '1rem' }}
            >
              Go to Dashboard <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <XCircle size={80} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.75rem' }}>
              Payment Failed
            </h1>
            <p style={{ color: 'var(--text-accent)', marginBottom: '0.5rem' }}>
              We couldn&apos;t process your payment.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              No amount has been deducted. Please try again or contact support if the issue persists.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => router.push('/pricing')}
                className="btn-primary"
                style={{ justifyContent: 'center', gap: '8px', padding: '14px 24px' }}
              >
                Try Again <ArrowRight size={18} />
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-accent)',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Loading…</div>}>
      <PaymentReturnContent />
    </Suspense>
  );
}
