'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--success-500)';
  if (score >= 60) return 'var(--warning-500)';
  return 'var(--danger-500)';
}

function getScoreBg(score) {
  if (score >= 80) return 'rgba(34, 197, 94, 0.15)';
  if (score >= 60) return 'rgba(245, 158, 11, 0.15)';
  return 'rgba(239, 68, 68, 0.15)';
}

export default function RekapPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!moduleId) return;

    fetch(`/api/modules/${moduleId}/rekap`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal memuat data rekap');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [moduleId]);

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}/rekap?format=csv`);
      if (!res.ok) throw new Error('Gagal mengunduh CSV');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap-${data?.module?.title || moduleId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh file CSV');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-secondary)' }}>Memuat data rekap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <p style={{ color: 'var(--danger-500)', fontWeight: 600 }}>{error}</p>
        <Link href="/dashboard" className="btn btn-secondary">← Kembali</Link>
      </div>
    );
  }

  const submissions = data?.submissions || [];
  const moduleTitle = data?.module?.title || 'Modul';

  // Calculate stats
  const totalStudents = submissions.length;
  const scores = submissions.map(s => s.score ?? s.skor ?? 0);
  const avgScore = totalStudents > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalStudents) : 0;
  const maxScore = totalStudents > 0 ? Math.max(...scores) : 0;
  const minScore = totalStudents > 0 ? Math.min(...scores) : 0;

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '0.75rem',
          }}
        >
          ← Kembali ke Dashboard
        </Link>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>📊 Rekap Penilaian</h1>
          <p>{moduleTitle}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-card-icon">👨‍🎓</div>
          <div className="stat-card-value">{totalStudents}</div>
          <div className="stat-card-label">Total Siswa</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-icon">📈</div>
          <div className="stat-card-value">{avgScore}</div>
          <div className="stat-card-label">Rata-rata Skor</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon">🏆</div>
          <div className="stat-card-value">{maxScore}</div>
          <div className="stat-card-label">Skor Tertinggi</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-card-icon">📉</div>
          <div className="stat-card-value">{minScore}</div>
          <div className="stat-card-label">Skor Terendah</div>
        </div>
      </div>

      {/* Export Button */}
      {totalStudents > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-success btn-sm"
            onClick={handleDownloadCSV}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span>Mengunduh...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Download CSV</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Table or Empty State */}
      {totalStudents === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Belum Ada Submission</div>
            <div className="empty-state-text">
              Belum ada siswa yang mengirimkan nilai untuk modul ini. Bagikan shortlink modul ke siswa untuk mulai mengumpulkan data.
            </div>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>Skor</th>
                <th>Waktu Submit</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => {
                const score = sub.score ?? sub.skor ?? 0;
                return (
                  <tr key={sub.id || idx}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{sub.studentName || sub.nama || '-'}</td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {sub.className || sub.kelas || '-'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 48,
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: getScoreColor(score),
                        background: getScoreBg(score),
                      }}>
                        {score}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {sub.createdAt || sub.submittedAt
                          ? formatDate(sub.createdAt || sub.submittedAt)
                          : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
