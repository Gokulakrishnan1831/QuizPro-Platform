'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Users, 
  BarChart3, 
  Settings, 
  Zap,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '@/store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Questions', href: '/admin/questions', icon: <FileText size={20} /> },
    { name: 'Bulk Upload', href: '/admin/upload', icon: <Upload size={20} /> },
    { name: 'Users', href: '/admin/users', icon: <Users size={20} /> },
    { name: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} /> },
    { name: 'Settings', href: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f23' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px', 
        background: 'rgba(30, 30, 60, 0.5)', 
        borderRight: '1px solid rgba(99, 102, 241, 0.1)',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '3rem' }}>
          <Zap size={28} color="#6366f1" fill="#6366f1" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
            Quiz<span style={{ color: '#06b6d4' }}>Pro</span> <span style={{ fontSize: '0.7rem', background: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>ADMIN</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
                  transition: 'all 0.2s ease'
                }}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button 
          onClick={logout}
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
            marginTop: 'auto'
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
