'use client';

import BrandLogo from '@/components/layout/BrandLogo';
import ThemeToggle from '@/components/layout/ThemeToggle';
import NotificationButton from '@/components/layout/NotificationButton';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User as UserIcon, LayoutDashboard, ChevronDown, Menu, X, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function Navbar() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      // Fetch profile photo if logged in
      if (firebaseUser) {
        fetch('/api/profile')
          .then(r => r.json())
          .then(d => setProfilePhoto(d?.profile?.profilePhotoUrl ?? null))
          .catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const initials = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  return (
    <nav
      className="max-md:!p-4 max-sm:!px-3"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '1rem 2rem',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
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
          href={user ? "/dashboard" : "/"}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <BrandLogo height={42} />
        </Link>

        <div className="desktop-only" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link
            href="/practice"
            style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Practice
          </Link>
          <Link
            href="/leaderboard"
            style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Leaderboard
          </Link>
          <Link
            href="/pricing"
            style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Pricing
          </Link>
          <Link
            href="/feedback"
            style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Feedback
          </Link>

          {loading ? (
            <div style={{ width: '130px', height: '40px' }} />
          ) : user ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              {/* Avatar button */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 12px 4px 4px',
                  borderRadius: '24px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--hover-bg)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: profilePhoto
                      ? `url(${profilePhoto}) center/cover`
                      : 'linear-gradient(135deg, #6366f1, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  {!profilePhoto && initials}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName?.split(' ')[0] || 'Profile'}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" style={{ transition: 'transform 0.2s', transform: showDropdown ? 'rotate(180deg)' : 'none' }} />
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '200px',
                    borderRadius: '12px',
                    background: 'var(--dropdown-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-lg)',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <Link
                    href="/profile"
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px', color: 'var(--text-primary)', textDecoration: 'none',
                      fontSize: '0.88rem', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserIcon size={16} color="var(--text-accent)" /> My Profile
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px', color: 'var(--text-primary)', textDecoration: 'none',
                      fontSize: '0.88rem', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LayoutDashboard size={16} color="var(--text-accent)" /> Dashboard
                  </Link>
                  <div style={{ height: '1px', background: 'var(--divider)', margin: '0' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px', color: '#f87171', background: 'transparent',
                      border: 'none', cursor: 'pointer', fontSize: '0.88rem',
                      width: '100%', textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}
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

          {user && <NotificationButton />}
          <ThemeToggle />
        </div>

        <button
          className="mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mobile-only"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--nav-bg)',
              borderBottom: '1px solid var(--border-color)',
              padding: '1rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backdropFilter: 'blur(10px)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Link
              href="/practice"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500, padding: '0.5rem 0' }}
            >
              Practice
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500, padding: '0.5rem 0' }}
            >
              Leaderboard
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500, padding: '0.5rem 0' }}
            >
              Pricing
            </Link>
            <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ThemeToggle />
              {user && <NotificationButton />}
            </div>

           <Link
            href="/feedback"
            style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Feedback
          </Link>

          {loading ? (
              <div style={{ width: '130px', height: '40px' }} />
            ) : user ? (
              <>
                <div style={{ height: '1px', background: 'var(--divider)', margin: '0.5rem 0' }} />
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  <UserIcon size={18} color="var(--text-accent)" /> My Profile
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  <LayoutDashboard size={18} color="var(--text-accent)" /> Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, fontSize: '1rem' }}
                >
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <>
                <div style={{ height: '1px', background: 'var(--divider)', margin: '0.5rem 0' }} />
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500, padding: '0.5rem 0' }}
                >
                  Login
                </Link>
                <Link
                  href="/get-started"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary"
                  style={{ textDecoration: 'none', justifyContent: 'center', marginTop: '0.5rem' }}
                >
                  Get Started
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
