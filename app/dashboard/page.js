'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  HandRaisedIcon,
  CubeTransparentIcon,
  UsersIcon,
  CircleStackIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  PencilSquareIcon,
  ChartBarSquareIcon,
  TrashIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Edit Modal State
  const [editingModule, setEditingModule] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', shortCode: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, statsRes, modulesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/stats'),
        fetch('/api/modules'),
      ]);

      if (userRes.ok) setUser(await userRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (modulesRes.ok) {
        const data = await modulesRes.json();
        setModules(Array.isArray(data) ? data : data.modules || []);
      }
    } catch (err) {
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopyLink = async (shortCode, moduleId) => {
    const url = window.location.origin + '/v/' + shortCode;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(moduleId);
      showToast('Link berhasil disalin!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Gagal menyalin link', 'error');
    }
  };

  const handleDelete = async (moduleId) => {
    if (!confirm('Yakin ingin menghapus modul ini?')) return;
    setDeletingId(moduleId);
    try {
      const res = await fetch(`/api/modules/${moduleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setModules(prev => prev.filter(m => m.id !== moduleId));
      showToast('Modul berhasil dihapus', 'success');
    } catch {
      showToast('Gagal menghapus modul', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (module) => {
    setTogglingId(module.id);
    const newStatus = !module.isActive;
    try {
      const res = await fetch(`/api/modules/${module.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!res.ok) throw new Error();
      setModules(prev =>
        prev.map(m => m.id === module.id ? { ...m, isActive: newStatus } : m)
      );
      showToast(`Modul ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch {
      showToast('Gagal mengubah status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (mod) => {
    setEditingModule(mod);
    setEditForm({ title: mod.title, shortCode: mod.shortCode });
  };

  const closeEditModal = () => {
    setEditingModule(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editForm.title, shortCode: editForm.shortCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan perubahan');
      }
      const data = await res.json();
      setModules(prev => prev.map(m => m.id === editingModule.id ? { ...m, title: data.module.title, shortCode: data.module.shortCode } : m));
      showToast('Modul berhasil diperbarui', 'success');
      closeEditModal();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-secondary)' }}>Memuat dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <ExclamationTriangleIcon style={{ width: 48, height: 48, color: 'var(--danger-500)' }} />
        <p style={{ color: 'var(--danger-500)', fontWeight: 600 }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchData}>Coba Lagi</button>
      </div>
    );
  }

  return (
    <>
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span>
                {toast.type === 'success' ? <CheckCircleIcon style={{ width: 20 }} /> : 
                 toast.type === 'error' ? <XCircleIcon style={{ width: 20 }} /> : 
                 <InformationCircleIcon style={{ width: 20 }} />}
              </span>
              <span style={{ fontSize: '0.875rem' }}>{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <h1>Dashboard Guru</h1>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Selamat datang kembali, <strong>{user?.name || 'Guru'}</strong>! <HandRaisedIcon style={{ width: 20 }} />
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-card-icon"><CubeTransparentIcon style={{ width: 28 }} /></div>
          <div className="stat-card-value">{stats?.totalModules ?? 0}</div>
          <div className="stat-card-label">Total Modul</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-icon"><UsersIcon style={{ width: 28 }} /></div>
          <div className="stat-card-value">{stats?.totalStudents ?? 0}</div>
          <div className="stat-card-label">Total Siswa</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon"><CircleStackIcon style={{ width: 28 }} /></div>
          <div className="stat-card-value">{formatFileSize(stats?.storageUsed ?? 0)}</div>
          <div className="stat-card-label">Storage Terpakai</div>
        </div>
      </div>

      {/* Modules Section */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DocumentDuplicateIcon style={{ width: 24 }} /> Modul Saya
        </h2>
        <Link href="/dashboard/upload" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <PlusIcon style={{ width: 16 }} /> Upload Modul
        </Link>
      </div>

      {modules.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><DocumentTextIcon style={{ width: 48, margin: '0 auto' }} /></div>
            <div className="empty-state-title">Belum Ada Modul</div>
            <div className="empty-state-text">
              Mulai dengan mengupload modul HTML pertama Anda. Modul akan otomatis mendapat shortlink yang bisa dibagikan ke siswa.
            </div>
            <Link href="/dashboard/upload" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpTrayIcon style={{ width: 20 }} /> Upload Modul Pertama
            </Link>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Shortlink</th>
                <th>Tanggal Upload</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {modules.map(mod => (
                <tr key={mod.id}>
                  <td data-label="Judul">
                    <div style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mod.title}
                    </div>
                  </td>
                  <td data-label="Shortlink">
                    <a
                      href={`${typeof window !== 'undefined' ? window.location.origin : ''}/v/${mod.shortCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--primary-400)',
                        fontSize: '0.825rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      /v/{mod.shortCode}
                    </a>
                  </td>
                  <td data-label="Tanggal Upload">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {formatDate(mod.createdAt)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <button
                      className={`badge ${mod.isActive ? 'badge-active' : 'badge-suspended'}`}
                      onClick={() => handleToggleStatus(mod)}
                      disabled={togglingId === mod.id}
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {togglingId === mod.id ? '...' : mod.isActive ? '● Aktif' : '● Nonaktif'}
                    </button>
                  </td>
                  <td data-label="Aksi">
                    <div className="table-actions">
                      <button
                        className={`btn btn-ghost btn-sm ${copiedId === mod.id ? 'copy-feedback' : ''}`}
                        onClick={() => handleCopyLink(mod.shortCode, mod.id)}
                        title="Salin Link"
                      >
                        {copiedId === mod.id ? <ClipboardDocumentCheckIcon style={{ width: 20 }} /> : <ClipboardIcon style={{ width: 20 }} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEditModal(mod)}
                        title="Edit"
                      >
                        <PencilSquareIcon style={{ width: 20 }} />
                      </button>
                      <Link
                        href={`/dashboard/rekap/${mod.id}`}
                        className="btn btn-ghost btn-sm"
                        title="Lihat Rekap"
                      >
                        <ChartBarSquareIcon style={{ width: 20 }} />
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(mod.id)}
                        disabled={deletingId === mod.id}
                        title="Hapus"
                        style={{ color: 'var(--danger-500)' }}
                      >
                        {deletingId === mod.id ? (
                          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        ) : <TrashIcon style={{ width: 20 }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingModule && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PencilSquareIcon style={{ width: 24 }} /> Edit Modul
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={closeEditModal}>
                <XCircleIcon style={{ width: 24 }} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Judul Modul</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                  disabled={savingEdit}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Custom Link</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ajar.in/v/</span>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.shortCode}
                    onChange={(e) => setEditForm({ ...editForm, shortCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                    disabled={savingEdit}
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="form-hint" style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Hanya huruf, angka, dan tanda hubung (-).
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal} disabled={savingEdit}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
