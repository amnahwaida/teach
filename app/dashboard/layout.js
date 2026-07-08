'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  ChartBarIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const navLinks = [
  { href: '/dashboard', icon: <ChartBarIcon style={{ width: 20, height: 20 }} />, label: 'Dashboard' },
  { href: '/dashboard/upload', icon: <ArrowUpTrayIcon style={{ width: 20, height: 20 }} />, label: 'Upload Modul' },
  { href: '/dashboard/prompt', icon: <BookOpenIcon style={{ width: 20, height: 20 }} />, label: 'Pustaka Prompt' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data))
      .catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      setLoggingOut(false);
    }
  };

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">A</div>
          <span className="sidebar-brand-text">Ajar.in</span>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${isActive(link.href) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: 'white',
                  flexShrink: 0,
                }}>
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {user.name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {user.email}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost w-full"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{ color: 'var(--danger-500)', justifyContent: 'flex-start' }}
          >
            {loggingOut ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span>Keluar...</span>
              </>
            ) : (
              <>
                <ArrowRightOnRectangleIcon style={{ width: 20, height: 20 }} />
                <span>Keluar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Mobile Top Bar */}
        <div className="mobile-topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <XMarkIcon style={{ width: 24, height: 24 }} /> : <Bars3Icon style={{ width: 24, height: 24 }} />}
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <div className="sidebar-brand-logo" style={{ width: 32, height: 32, fontSize: '0.875rem' }}>A</div>
            <span className="sidebar-brand-text" style={{ fontSize: '1rem' }}>Ajar.in</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {children}
      </main>
    </div>
  );
}
