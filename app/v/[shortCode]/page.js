'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  ExclamationCircleIcon,
  LinkIcon,
  BookOpenIcon,
  UserIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  CheckBadgeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function StudentViewerPage() {
  const params = useParams();
  const shortCode = params.shortCode;

  const [step, setStep] = useState('loading'); // 'loading' | 'error' | 'form' | 'iframe-loading' | 'active' | 'success'
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [score, setScore] = useState(null);
  const [error, setError] = useState('');
  const [moduleInfo, setModuleInfo] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const iframeRef = useRef(null);
  const hasSubmitted = useRef(false);

  // Fetch module info on mount
  useEffect(() => {
    async function fetchModuleInfo() {
      try {
        const res = await fetch('/api/modules/info/' + shortCode);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Link tidak ditemukan');
          } else {
            setError('Terjadi kesalahan. Silakan coba lagi.');
          }
          setStep('error');
          return;
        }
        const data = await res.json();
        if (!data.isActive) {
          setError('Modul ini sedang tidak aktif');
          setStep('error');
          return;
        }
        setModuleInfo(data);
        setStep('form');
      } catch (err) {
        console.error('Failed to fetch module info:', err);
        setError('Tidak dapat terhubung ke server');
        setStep('error');
      }
    }
    if (shortCode) {
      fetchModuleInfo();
    }
  }, [shortCode]);

  // PostMessage listener
  const handleMessage = useCallback(async (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.action !== 'KIRIM_NILAI') return;
    if (hasSubmitted.current) return;

    hasSubmitted.current = true;
    const skor = event.data.skor ?? event.data.score ?? 0;
    setScore(skor);
    setSubmitting(true);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: moduleInfo?.id,
          studentName,
          studentClass,
          score: skor,
          answersJson: event.data.answers ? JSON.stringify(event.data.answers) : null,
        }),
      });

      if (!res.ok) {
        console.error('Submission failed:', await res.text());
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
      setStep('success');
    }
  }, [moduleInfo, studentName, studentClass]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Handle form submit
  function handleFormSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!studentName.trim()) {
      setFormError('Nama lengkap wajib diisi');
      return;
    }
    if (!studentClass.trim()) {
      setFormError('Kelas wajib diisi');
      return;
    }

    setStep('iframe-loading');
  }

  // Handle iframe load
  function handleIframeLoad() {
    setIframeLoaded(true);
    setStep('active');
  }

  // ============ RENDER STATES ============

  // Initial loading
  if (step === 'loading') {
    return (
      <div className="viewer-container" style={styles.animatedBg}>
        <div style={styles.bgOrb1}></div>
        <div style={styles.bgOrb2}></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', zIndex: 1 }}>
          <div className="spinner spinner-lg"></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Memuat...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="viewer-container" style={styles.animatedBg}>
        <div style={styles.bgOrb1}></div>
        <div style={styles.bgOrb2}></div>
        <div className="viewer-card" style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            {error === 'Modul ini sedang tidak aktif' 
              ? <ExclamationCircleIcon style={{ width: 64, height: 64, color: 'var(--text-secondary)' }} />
              : <LinkIcon style={{ width: 64, height: 64, color: 'var(--text-secondary)' }} />}
          </div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{error}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error === 'Modul ini sedang tidak aktif'
              ? 'Guru kamu belum mengaktifkan modul ini. Silakan hubungi guru untuk informasi lebih lanjut.'
              : 'Link yang kamu akses tidak valid atau sudah tidak tersedia.'}
          </p>
          <div style={styles.brandingSmall}>
            <span style={styles.brandingDot}></span>
            Ajar.in
          </div>
        </div>
      </div>
    );
  }

  // Identity form
  if (step === 'form') {
    return (
      <div className="viewer-container" style={styles.animatedBg}>
        <div style={styles.bgOrb1}></div>
        <div style={styles.bgOrb2}></div>
        <div className="viewer-card" style={{ zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={styles.logoIcon}>
              <BookOpenIcon style={{ width: 32, height: 32, color: 'white' }} />
            </div>
          </div>

          <h2 className="viewer-card-title">
            {moduleInfo?.title || 'Ajar.in'}
          </h2>
          <p className="viewer-card-subtitle">
            Silakan isi data diri kamu untuk mulai mengerjakan
          </p>

          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="studentName" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <UserIcon style={{ width: 16 }} /> Nama Lengkap
              </label>
              <input
                id="studentName"
                type="text"
                className="form-input"
                placeholder="Masukkan nama lengkap kamu"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="studentClass" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AcademicCapIcon style={{ width: 16 }} /> Kelas
              </label>
              <input
                id="studentClass"
                type="text"
                className="form-input"
                placeholder="Contoh: 9A"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                autoComplete="off"
              />
            </div>

            {formError && (
              <div style={styles.formAlert}>
                <ExclamationTriangleIcon style={{ width: 16, flexShrink: 0 }} /> {formError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <PaperAirplaneIcon style={{ width: 20 }} /> Mulai Mengerjakan
            </button>
          </form>

          <div style={styles.brandingBottom}>
            <div style={styles.brandingSmall}>
              <span style={styles.brandingDot}></span>
              Powered by <strong>Ajar.in</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Iframe loading & active states
  if (step === 'iframe-loading' || step === 'active') {
    return (
      <>
        {/* Loading overlay - shown while iframe loads */}
        {!iframeLoaded && (
          <div className="iframe-loading">
            <div style={styles.loadingContent}>
              <div className="spinner spinner-lg"></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
                Memuat media pembelajaran...
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {moduleInfo?.title}
              </p>
            </div>
          </div>
        )}

        {/* The iframe */}
        <div className="iframe-wrapper">
          <iframe
            ref={iframeRef}
            src={'/api/serve/' + shortCode}
            sandbox="allow-scripts allow-same-origin"
            onLoad={handleIframeLoad}
            title={moduleInfo?.title || 'Modul Pembelajaran'}
            allow="autoplay"
          />
        </div>
      </>
    );
  }

  // Success overlay
  if (step === 'success') {
    return (
      <div className="success-overlay" style={styles.successBg}>
        {/* Floating particles for celebration */}
        <div style={styles.confettiContainer}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.confettiDot,
                left: `${8 + Math.random() * 84}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                backgroundColor: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'][i % 6],
              }}
            ></div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <CheckBadgeIcon style={{ width: 64, height: 64, color: 'var(--success-500)' }} />
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          marginBottom: '0.5rem',
          color: 'var(--text-primary)',
        }}>
          Terima kasih!
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          marginBottom: '1.5rem',
        }}>
          {studentName}
        </p>

        <div className="success-score">
          Nilai kamu: {score}
        </div>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem'
        }}>
          Nilai sudah berhasil tercatat <SparklesIcon style={{ width: 16, color: 'var(--primary-400)' }} />
        </p>

        <div style={styles.successCard}>
          <div style={styles.successCardRow}>
            <span style={{ color: 'var(--text-muted)' }}>Nama</span>
            <span style={{ fontWeight: 600 }}>{studentName}</span>
          </div>
          <div style={styles.successCardDivider}></div>
          <div style={styles.successCardRow}>
            <span style={{ color: 'var(--text-muted)' }}>Kelas</span>
            <span style={{ fontWeight: 600 }}>{studentClass}</span>
          </div>
          <div style={styles.successCardDivider}></div>
          <div style={styles.successCardRow}>
            <span style={{ color: 'var(--text-muted)' }}>Modul</span>
            <span style={{ fontWeight: 600 }}>{moduleInfo?.title || '-'}</span>
          </div>
        </div>

        <div style={{ ...styles.brandingBottom, marginTop: '2rem' }}>
          <div style={styles.brandingSmall}>
            <span style={styles.brandingDot}></span>
            Powered by <strong>Ajar.in</strong>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============ INLINE STYLES ============
const styles = {
  animatedBg: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0f172a 0%, #1a1f3a 25%, #0f172a 50%, #1a2744 75%, #0f172a 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 15s ease infinite',
  },
  bgOrb1: {
    position: 'absolute',
    top: '-150px',
    right: '-150px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '-150px',
    left: '-150px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  logoIcon: {
    width: '64px',
    height: '64px',
    background: 'var(--gradient-primary)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    margin: '0 auto',
    boxShadow: 'var(--shadow-glow)',
  },
  formAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--danger-500)',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
  },
  brandingBottom: {
    textAlign: 'center',
    marginTop: '1.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--border-color)',
  },
  brandingSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  brandingDot: {
    width: '8px',
    height: '8px',
    background: 'var(--gradient-primary)',
    borderRadius: '50%',
    display: 'inline-block',
  },
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  successBg: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
  },
  confettiContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confettiDot: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    top: '-10px',
    animation: 'confettiFall 4s linear infinite',
    opacity: 0.6,
  },
  successCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.25rem',
    width: '100%',
    maxWidth: '360px',
    marginTop: '1.5rem',
  },
  successCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    fontSize: '0.875rem',
  },
  successCardDivider: {
    height: '1px',
    background: 'var(--border-color)',
  },
};
