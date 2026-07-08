'use client';

import { useState, useEffect } from 'react';

function formatStorage(bytes) {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${val} ${sizes[i]}`;
}

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0 || value === undefined) {
      setDisplay(0);
      return;
    }

    let start = 0;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(eased * value);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display.toLocaleString('id-ID')}</>;
}

const STAT_CARDS = [
  { key: 'totalGuru', label: 'Total Guru', icon: '👨‍🏫', color: 'blue' },
  { key: 'totalModul', label: 'Total Modul', icon: '📚', color: 'purple' },
  { key: 'totalSiswaMengerjakan', label: 'Siswa Mengerjakan', icon: '✍️', color: 'green' },
  { key: 'totalStorage', label: 'Total Storage', icon: '💾', color: 'orange', isStorage: true },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Gagal memuat statistik');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>📊 Dashboard Admin</h1>
        <p>Selamat datang kembali! Berikut ringkasan platform Ajar.in</p>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            color: 'var(--danger-500)',
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setError(''); setLoading(true); fetchStats(); }}
            style={{ marginLeft: 'auto' }}
          >
            🔄 Coba Lagi
          </button>
        </div>
      )}

      <div className="stats-grid">
        {STAT_CARDS.map((card, index) => (
          <div
            key={card.key}
            className={`stat-card ${card.color}`}
            style={{
              animation: `slideUp 0.5s ease-out ${index * 0.1}s both`,
            }}
          >
            <div className="stat-card-icon">{card.icon}</div>

            {loading ? (
              <>
                <div
                  className="skeleton"
                  style={{
                    height: '32px',
                    width: '80px',
                    marginBottom: '0.5rem',
                  }}
                />
                <div
                  className="skeleton"
                  style={{
                    height: '14px',
                    width: '100px',
                  }}
                />
              </>
            ) : (
              <>
                <div className="stat-card-value">
                  {card.isStorage
                    ? formatStorage(stats?.[card.key] || 0)
                    : <AnimatedNumber value={stats?.[card.key] || 0} />
                  }
                </div>
                <div className="stat-card-label">{card.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick Info Section */}
      {!loading && stats && (
        <div
          className="card"
          style={{
            animation: 'slideUp 0.5s ease-out 0.4s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <h3 style={{ fontSize: '1.1rem' }}>Informasi Cepat</h3>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                padding: '1rem',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                Platform Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--success-500)',
                    display: 'inline-block',
                    boxShadow: '0 0 6px var(--success-500)',
                  }}
                />
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Aktif & Berjalan</span>
              </div>
            </div>
            <div
              style={{
                padding: '1rem',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                Terakhir Diperbarui
              </div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
