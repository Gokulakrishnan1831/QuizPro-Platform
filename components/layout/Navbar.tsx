'use client';

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        setUser(null);
      } else {
        setUser(data.user);
      }
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '1rem 2rem',
        background: 'rgba(15, 15, 35, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
          }}
        >
          <Zap size={28} color="#6366f1" fill="#6366f1" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
            Quiz<span style={{ color: '#06b6d4' }}>Pro</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link
            href="/practice"
            style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}
          >
            Practice
          </Link>
          <Link
            href="/pricing"
            style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}
          >
            Pricing
          </Link>

          {loading ? (
            <div style={{ width: '130px', height: '40px' }} /> // Spacer to prevent layout shift
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  color: '#a5b4fc',
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UserIcon size={16} />
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'transparent',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.9rem',
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}
              >
                Login
              </Link>
              <Link
                href="/get-started"
                className="btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
