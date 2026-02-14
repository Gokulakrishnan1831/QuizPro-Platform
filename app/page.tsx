'use client';

import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, BrainCircuit, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', paddingTop: '80px' }}>
      <Navbar />
      
      {/* Hero Section */}
      <section style={{ 
        padding: '100px 20px', 
        textAlign: 'center',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 style={{ fontSize: '4rem', fontWeight: '800', marginBottom: '1.5rem', lineHeight: '1.1' }}>
            Master Data Analytics with <br />
            <span className="text-gradient">AI-Powered Practice</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#a5b4fc', marginBottom: '2.5rem', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
            The premium quiz platform for data professionals. Infinite questions, 
            gamified learning, and deep analytics to ace your next interview.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/get-started" className="btn-primary" style={{ fontSize: '1.1rem', padding: '14px 32px' }}>
              Start Practicing Now <ArrowRight size={20} />
            </Link>
            <Link href="/login" style={{ 
              padding: '14px 32px', 
              borderRadius: '8px', 
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              View Demo
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem' 
        }}>
          <FeatureCard 
            icon={<BrainCircuit size={32} color="#6366f1" />}
            title="AI Question Engine"
            description="Never run out of practice. Our AI generates unique, high-quality questions tailored to your skill level."
          />
          <FeatureCard 
            icon={<Trophy size={32} color="#06b6d4" />}
            title="Gamified Mastery"
            description="Earn XP, maintain streaks, and level up your skills. Learning feels like a game, not a chore."
          />
          <FeatureCard 
            icon={<BarChart3 size={32} color="#10b981" />}
            title="Deep Analytics"
            description="Track your accuracy, speed, and progress across different domains like SQL, Python, and Statistics."
          />
        </div>
      </section>

      {/* Glassmorphism Background Elements */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'rgba(99, 102, 241, 0.15)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        zIndex: -1
      }} />
      <div style={{
        position: 'fixed',
        bottom: '10%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'rgba(6, 182, 212, 0.1)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        zIndex: -1
      }} />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card" 
      style={{ padding: '2.5rem', textAlign: 'left' }}
    >
      <div style={{ marginBottom: '1.5rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>{title}</h3>
      <p style={{ color: '#a5b4fc', lineHeight: '1.6' }}>{description}</p>
    </motion.div>
  );
}
