'use client';

import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/home/HeroSection';
import PersonaSelector from '@/components/home/PersonaSelector';
import FeaturesGrid from '@/components/home/FeaturesGrid';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';
import Footer from '@/components/home/Footer';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged, type User } from 'firebase/auth';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg-start)' }} />;
  }

  const isLoggedIn = !!user;

  return (
    <div style={{ minHeight: '100vh', paddingTop: '80px' }}>
      <Navbar />

      <HeroSection isLoggedIn={isLoggedIn} isLoading={loading} />
      <PersonaSelector />
      <FeaturesGrid />
      <Testimonials />
      <CTASection isLoggedIn={isLoggedIn} isLoading={loading} />
      <Footer />

      {/* Glassmorphism background orbs */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '5%',
          width: '350px',
          height: '350px',
          background: 'rgba(99, 102, 241, 0.12)',
          filter: 'blur(120px)',
          borderRadius: '50%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          background: 'rgba(6, 182, 212, 0.08)',
          filter: 'blur(140px)',
          borderRadius: '50%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          right: '20%',
          width: '250px',
          height: '250px',
          background: 'rgba(16, 185, 129, 0.06)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
