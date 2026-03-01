'use client';

import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/home/HeroSection';
import PersonaSelector from '@/components/home/PersonaSelector';
import FeaturesGrid from '@/components/home/FeaturesGrid';
import Testimonials from '@/components/home/Testimonials';
import CTASection from '@/components/home/CTASection';
import Footer from '@/components/home/Footer';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', paddingTop: '80px' }}>
      <Navbar />

      <HeroSection />
      <PersonaSelector />
      <FeaturesGrid />
      <Testimonials />
      <CTASection />
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
