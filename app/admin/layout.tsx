'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  Users,
  BarChart3,
  Zap,
  LogOut,
  IndianRupee,
  QrCode,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPayments, setPendingPayments] = useState(0);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Security check: only allow logged in ADMIN from Admin table
  useEffect(() => {
    // Don't check auth on the login page itself
    if (pathname === '/admin/login') {
      setIsAdmin(true);
      return;
    }

    fetch('/api/admin/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not admin');
        return res.json();
      })
      .then((data) => {
        if (data.admin) {
          setIsAdmin(true);
        } else {
          router.push('/admin/login');
        }
      })
      .catch(() => router.push('/admin/login'));
  }, [router, pathname]);

  // Poll pending payments count to show badge
  useEffect(() => {
    if (!isAdmin) return;
    const load = () =>
      fetch('/api/admin/payments?status=pending')
        .then((r) => r.json())
        .then((d) => setPendingPayments((d.requests ?? []).length))
        .catch(() => { });
    load();
  }, [pathname, isAdmin]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (isAdmin === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f23' }}>
        <Zap size={32} color="#6366f1" style={{ animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Users', href: '/admin/users', icon: <Users size={20} /> },
    { name: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} /> },
    {
      name: 'Payments',
      href: '/admin/payments',
      icon: <IndianRupee size={20} />,
      badge: pendingPayments > 0 ? pendingPayments : undefined,
    },
    { name: 'Bulk Upload', href: '/admin/upload', icon: <Upload size={20} /> },
    { name: 'QR & Settings', href: '/admin/settings', icon: <QrCode size={20} /> },
  ];

  // If on login page, render children without the admin sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f23' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'rgba(30, 30, 60, 0.5)',
          borderRight: '1px solid rgba(99, 102, 241, 0.1)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            marginBottom: '3rem',
          }}
        >
          <Zap size={28} color="#6366f1" fill="#6366f1" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
            Quiz<span style={{ color: '#06b6d4' }}>Pro</span>{' '}
            <span
              style={{
                fontSize: '0.7rem',
                background: 'var(--primary)',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '4px',
              }}
            >
              ADMIN
            </span>
          </span>
        </Link>

        <nav
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#a5b4fc',
                  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {item.icon}
                {item.name}
                {(item as any).badge !== undefined && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#f59e0b',
                      color: '#0f0f23',
                      fontWeight: '800',
                      fontSize: '0.7rem',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      minWidth: '22px',
                      textAlign: 'center',
                    }}
                  >
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            marginTop: 'auto',
          }}
        >
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '2rem 3rem' }}>
        {children}
      </main>
    </div>
  );
}
