'use client';

import { useState, useEffect } from 'react';

export default function PromptPage() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showGuideId, setShowGuideId] = useState(null);

  useEffect(() => {
    fetch('/api/prompts')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setPrompts(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Gagal memuat pustaka prompt');
        setLoading(false);
      });
  }, []);

  const categories = ['Semua', ...new Set(prompts.map(p => p.category))];

  const filtered = activeCategory === 'Semua'
    ? prompts
    : prompts.filter(p => p.category === activeCategory);

  const handleCopy = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-secondary)' }}>Memuat pustaka prompt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <p style={{ color: 'var(--danger-500)', fontWeight: 600 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Coba Lagi</button>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1>📚 Pustaka Prompt</h1>
        <p>Kumpulan prompt yang sudah dioptimalkan untuk membuat media pembelajaran interaktif</p>
      </div>

      {/* Category Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'Semua' && '📋 '}
            {cat === 'Kuis' && '🎮 '}
            {cat === 'Simulasi' && '🔬 '}
            {cat === 'Interaktif' && '🧩 '}
            {cat}
          </button>
        ))}
      </div>

      {/* Prompt Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '1.25rem',
      }}>
        {filtered.map((prompt, index) => (
          <div
            key={prompt.id}
            className="prompt-card"
            style={{ animationDelay: `${index * 0.08}s`, animation: 'slideUp 0.4s ease-out backwards' }}
          >
            {/* Header */}
            <div className="prompt-card-header">
              <span className="prompt-card-icon">{prompt.icon}</span>
              <div>
                <div className="prompt-card-category">{prompt.category}</div>
                <div className="prompt-card-title">{prompt.title}</div>
              </div>
            </div>

            {/* Description */}
            <div className="prompt-card-desc">{prompt.description}</div>

            {/* Expandable Prompt Content */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                style={{ justifyContent: 'space-between', marginBottom: expandedId === prompt.id ? '0.5rem' : 0 }}
              >
                <span>💬 Lihat Prompt</span>
                <span style={{
                  transition: 'transform var(--transition-fast)',
                  transform: expandedId === prompt.id ? 'rotate(180deg)' : 'rotate(0)',
                  display: 'inline-block',
                }}>
                  ▼
                </span>
              </button>
              {expandedId === prompt.id && (
                <div className="prompt-content" style={{ animation: 'slideUp 0.2s ease-out' }}>
                  {prompt.prompt}
                </div>
              )}
            </div>

            {/* Guide Toggle */}
            {prompt.guide && (
              <div style={{ marginBottom: '1rem' }}>
                <button
                  className="btn btn-ghost btn-sm w-full"
                  onClick={() => setShowGuideId(showGuideId === prompt.id ? null : prompt.id)}
                  style={{ justifyContent: 'space-between', marginBottom: showGuideId === prompt.id ? '0.5rem' : 0 }}
                >
                  <span>📖 Lihat Panduan</span>
                  <span style={{
                    transition: 'transform var(--transition-fast)',
                    transform: showGuideId === prompt.id ? 'rotate(180deg)' : 'rotate(0)',
                    display: 'inline-block',
                  }}>
                    ▼
                  </span>
                </button>
                {showGuideId === prompt.id && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem',
                    fontSize: '0.825rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    animation: 'slideUp 0.2s ease-out',
                  }}>
                    💡 {prompt.guide}
                  </div>
                )}
              </div>
            )}

            {/* Copy Button */}
            <button
              className="btn btn-primary btn-sm w-full"
              onClick={() => handleCopy(prompt)}
            >
              {copiedId === prompt.id ? '✅ Tersalin!' : '📋 Salin Prompt'}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Tidak ada prompt</div>
            <div className="empty-state-text">Belum ada prompt untuk kategori ini.</div>
          </div>
        </div>
      )}
    </>
  );
}
