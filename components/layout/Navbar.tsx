'use client';

import BrandLogo from '@/components/layout/BrandLogo';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    // Clear server-side session cookie
    await fetch('/api/auth/session', { method: 'DELETE' });
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
          gap: '1rem',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <BrandLogo iconSize={34} textSize="1.45rem" />
        </Link>

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
            <div style={{ width: '130px', height: '40px' }} />
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
