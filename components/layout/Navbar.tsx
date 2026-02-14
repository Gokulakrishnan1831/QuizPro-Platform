'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function Navbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      padding: '1rem 2rem',
      background: 'rgba(15, 15, 35, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Zap size={28} color="#6366f1" fill="#6366f1" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
            Quiz<span style={{ color: '#06b6d4' }}>Pro</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link href="/practice" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>Practice</Link>
          <Link href="/pricing" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>Pricing</Link>
          <Link href="/login" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>Login</Link>
          <Link href="/get-started" className="btn-primary" style={{ textDecoration: 'none' }}>
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
