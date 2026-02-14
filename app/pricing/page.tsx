'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Check, Zap, Shield, Star, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => {
        setPackages(data);
        setLoading(false);
      });
  }, []);

  const handleSubscribe = async (pkgId: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/pricing');
      return;
    }

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, packageId: pkgId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Subscription successful! (Simulated)');
        router.push('/dashboard');
      }
    } catch (error) {
      alert('Checkout failed');
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Loading Pricing...</div>;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '80px' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem' }}>
            Simple, <span className="text-gradient">Transparent Pricing</span>
          </h1>
          <p style={{ color: '#a5b4fc', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            Choose the plan that fits your preparation needs. All plans include full access to our core question bank.
          </p>
        </header>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '2rem',
          alignItems: 'flex-start'
        }}>
          {packages.map((pkg) => {
            const features = JSON.parse(pkg.features);
            return (
              <motion.div 
                key={pkg.id}
                whileHover={{ y: -10 }}
                className="glass-card"
                style={{ 
                  padding: '3rem 2rem', 
                  position: 'relative',
                  border: pkg.isPopular ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  background: pkg.isPopular ? 'rgba(99, 102, 241, 0.05)' : 'var(--card-bg)'
                }}
              >
                {pkg.isPopular && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-15px', 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Star size={14} fill="white" /> MOST POPULAR
                  </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>{pkg.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '3rem', fontWeight: '800' }}>₹{pkg.price}</span>
                    {pkg.originalPrice && (
                      <span style={{ color: '#6b7280', textDecoration: 'line-through', fontSize: '1.2rem' }}>₹{pkg.originalPrice}</span>
                    )}
                  </div>
                  <p style={{ color: '#a5b4fc', marginTop: '0.5rem' }}>for {pkg.durationDays} days</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                  {features.map((feature: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#cbd5e1' }}>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Check size={14} color="var(--success)" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSubscribe(pkg.id)}
                  className={pkg.isPopular ? "btn-primary" : ""}
                  style={{ 
                    width: '100%', 
                    justifyContent: 'center', 
                    padding: '14px',
                    borderRadius: '8px',
                    border: pkg.isPopular ? 'none' : '1px solid rgba(99, 102, 241, 0.3)',
                    background: pkg.isPopular ? undefined : 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Get Started <ArrowRight size={18} />
                </button>
              </motion.div>
            );
          })}
        </div>

        <section style={{ marginTop: '6rem', textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            <div style={{ padding: '2rem' }}>
              <Shield size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Secure Payments</h4>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Encrypted transactions via Razorpay</p>
            </div>
            <div style={{ padding: '2rem' }}>
              <Zap size={32} color="var(--secondary)" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Instant Access</h4>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Start practicing immediately after payment</p>
            </div>
            <div style={{ padding: '2rem' }}>
              <Star size={32} color="var(--warning)" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Cancel Anytime</h4>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No long-term commitments or hidden fees</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
