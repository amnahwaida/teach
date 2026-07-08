'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  TrashIcon,
  UserGroupIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  KeyIcon,
  DocumentCheckIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

// ──────────────────────────────────────────
// Toast Component
// ──────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => onRemove(t.id)}
          style={{ cursor: 'pointer' }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {t.type === 'success' ? <CheckCircleIcon style={{ width: 20 }} /> : t.type === 'error' ? <XCircleIcon style={{ width: 20 }} /> : <InformationCircleIcon style={{ width: 20 }} />}
          </span>
          <span style={{ flex: 1, fontSize: '0.875rem' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────
// Confirmation Modal
// ──────────────────────────────────────────
function ConfirmModal({ title, message, confirmText, confirmClass, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><XMarkIcon style={{ width: 20 }} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          {message}
        </p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button className={`btn ${confirmClass || 'btn-danger'}`} onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Memproses...
              </>
            ) : (
              confirmText || 'Konfirmasi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────
export default function KelolaGuruPage() {
  const [gurus, setGurus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingGuru, setEditingGuru] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', status: 'active' });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Confirm dialog
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Toast
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ──────── Fetch ────────
  const fetchGurus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/guru');
      if (!res.ok) throw new Error('Gagal memuat data guru');
      const data = await res.json();
      setGurus(data.guru || data.gurus || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGurus();
  }, [fetchGurus]);

  // ──────── Modal ────────
  const openCreateModal = () => {
    setEditingGuru(null);
    setFormData({ name: '', email: '', password: '', status: 'active' });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (guru) => {
    setEditingGuru(guru);
    setFormData({
      name: guru.name || guru.nama,
      email: guru.email,
      password: '',
      status: guru.status || 'active',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    if (formLoading) return;
    setShowModal(false);
    setEditingGuru(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Nama wajib diisi';
    if (!formData.email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = 'Format email tidak valid';
    if (!editingGuru && !formData.password) errors.password = 'Password wajib diisi';
    if (!editingGuru && formData.password && formData.password.length < 6)
      errors.password = 'Password minimal 6 karakter';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);

    try {
      const isEdit = !!editingGuru;
      const url = isEdit ? `/api/admin/guru/${editingGuru.id}` : '/api/admin/guru';
      const method = isEdit ? 'PUT' : 'POST';

      const body = { ...formData };
      if (isEdit && !body.password) delete body.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Gagal ${isEdit ? 'memperbarui' : 'menambahkan'} guru`);
      }

      addToast(`Guru berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}!`);
      closeModal();
      fetchGurus();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ──────── Actions ────────
  const handleDelete = (guru) => {
    setConfirm({
      title: <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrashIcon style={{ width: 20 }} /> Hapus Guru</span>,
      message: `Apakah Anda yakin ingin menghapus "${guru.name || guru.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      confirmClass: 'btn-danger',
      action: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/admin/guru/${guru.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Gagal menghapus guru');
          }
          addToast('Guru berhasil dihapus');
          fetchGurus();
        } catch (err) {
          addToast(err.message, 'error');
        } finally {
          setConfirmLoading(false);
          setConfirm(null);
        }
      },
    });
  };

  const handleToggleStatus = (guru) => {
    const newStatus = guru.status === 'active' ? 'suspended' : 'active';
    const label = newStatus === 'active' ? 'mengaktifkan' : 'menonaktifkan';
    setConfirm({
      title: newStatus === 'active' ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckIcon style={{ width: 20 }} /> Aktifkan Guru</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><NoSymbolIcon style={{ width: 20 }} /> Nonaktifkan Guru</span>,
      message: `Apakah Anda yakin ingin ${label} "${guru.name || guru.nama}"?`,
      confirmText: newStatus === 'active' ? 'Aktifkan' : 'Nonaktifkan',
      confirmClass: newStatus === 'active' ? 'btn-success' : 'btn-danger',
      action: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/admin/guru/${guru.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
          if (!res.ok) throw new Error('Gagal mengubah status guru');
          addToast(`Status guru berhasil diubah ke ${newStatus}`);
          fetchGurus();
        } catch (err) {
          addToast(err.message, 'error');
        } finally {
          setConfirmLoading(false);
          setConfirm(null);
        }
      },
    });
  };

  const handleResetPassword = (guru) => {
    setConfirm({
      title: <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><KeyIcon style={{ width: 20 }} /> Reset Password</span>,
      message: `Reset password untuk "${guru.name || guru.nama}"? Password baru akan menjadi "password123".`,
      confirmText: 'Reset Password',
      confirmClass: 'btn-primary',
      action: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/admin/guru/${guru.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'password123' }),
          });
          if (!res.ok) throw new Error('Gagal reset password');
          addToast('Password berhasil direset menjadi "password123"');
        } catch (err) {
          addToast(err.message, 'error');
        } finally {
          setConfirmLoading(false);
          setConfirm(null);
        }
      },
    });
  };

  // ──────── Render ────────
  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserGroupIcon style={{ width: 32 }} /> Kelola Guru</h1>
          <p>Tambah, edit, dan kelola akun guru di platform</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusIcon style={{ width: 20 }} /> Tambah Guru
        </button>
      </div>

      {/* Error */}
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
          <ExclamationTriangleIcon style={{ width: 24, flexShrink: 0 }} />
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setError(''); setLoading(true); fetchGurus(); }}
            style={{ marginLeft: 'auto' }}
          >
            <ArrowPathIcon style={{ width: 20, marginRight: '0.25rem' }} /> Coba Lagi
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Status</th>
                <th>Tanggal Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j}>
                      <div
                        className="skeleton"
                        style={{
                          height: '16px',
                          width: j === 5 ? '140px' : `${60 + j * 20}px`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : gurus.length === 0 ? (
        /* Empty State */
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><UserGroupIcon style={{ width: 48, margin: '0 auto' }} /></div>
            <div className="empty-state-title">Belum Ada Guru</div>
            <p className="empty-state-text">
              Mulai tambahkan guru untuk mengelola modul pembelajaran di platform Ajar.in.
            </p>
            <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusIcon style={{ width: 20 }} /> Tambah Guru Pertama
            </button>
          </div>
        </div>
      ) : (
        /* Table */
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Status</th>
                <th>Tanggal Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {gurus.map((guru) => (
                <tr key={guru.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--gradient-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        {(guru.name || guru.nama) ? (guru.name || guru.nama).charAt(0).toUpperCase() : '?'}
                      </div>
                      <span style={{ fontWeight: '600' }}>{guru.name || guru.nama}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{guru.email}</td>
                  <td>
                    <span className={`badge ${guru.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>
                      {guru.status === 'active' ? '● Aktif' : '● Nonaktif'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {guru.createdAt
                      ? new Date(guru.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEditModal(guru)}
                        title="Edit"
                      >
                        <PencilSquareIcon style={{ width: 20 }} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleStatus(guru)}
                        title={guru.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {guru.status === 'active' ? <NoSymbolIcon style={{ width: 20 }} /> : <CheckIcon style={{ width: 20 }} />}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleResetPassword(guru)}
                        title="Reset Password"
                      >
                        <KeyIcon style={{ width: 20 }} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(guru)}
                        title="Hapus"
                        style={{ color: 'var(--danger-500)' }}
                      >
                        <TrashIcon style={{ width: 20 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────── Add/Edit Modal ──────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingGuru ? <PencilSquareIcon style={{ width: 24 }} /> : <PlusIcon style={{ width: 24 }} />}
                {editingGuru ? 'Edit Guru' : 'Tambah Guru Baru'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <XMarkIcon style={{ width: 24 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="guru-nama">Nama Lengkap</label>
                <input
                  id="guru-nama"
                  type="text"
                  className="form-input"
                  placeholder="Masukkan nama guru"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={formLoading}
                  autoFocus
                />
                {formErrors.name && <div className="form-error">{formErrors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="guru-email">Email</label>
                <input
                  id="guru-email"
                  type="email"
                  className="form-input"
                  placeholder="guru@sekolah.ac.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={formLoading}
                />
                {formErrors.email && <div className="form-error">{formErrors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="guru-password">
                  Password {editingGuru && <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  id="guru-password"
                  type="password"
                  className="form-input"
                  placeholder={editingGuru ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={formLoading}
                />
                {formErrors.password && <div className="form-error">{formErrors.password}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="guru-status">Status</label>
                <select
                  id="guru-status"
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={formLoading}
                >
                  <option value="active">Aktif</option>
                  <option value="suspended">Nonaktif</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={formLoading}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                      Menyimpan...
                    </>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DocumentCheckIcon style={{ width: 20 }} />
                      {editingGuru ? 'Simpan Perubahan' : 'Tambah Guru'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────── Confirmation Modal ──────── */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          confirmClass={confirm.confirmClass}
          onConfirm={confirm.action}
          onCancel={() => !confirmLoading && setConfirm(null)}
          loading={confirmLoading}
        />
      )}
    </>
  );
}
