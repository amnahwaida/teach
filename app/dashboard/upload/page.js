'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  SparklesIcon,
  CheckIcon,
  ClipboardIcon,
  ArrowUpTrayIcon,
  ChartBarSquareIcon,
  PencilSquareIcon,
  LinkIcon,
  DocumentIcon,
  DocumentCheckIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadPage() {
  const [title, setTitle] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (f) => {
    if (!f) return 'Pilih file terlebih dahulu';
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['html', 'htm'].includes(ext)) return 'Hanya file .html atau .htm yang diperbolehkan';
    if (f.size > MAX_SIZE) return `Ukuran file melebihi batas 5MB (file: ${formatFileSize(f.size)})`;
    return '';
  };

  const handleFileSelect = (f) => {
    setError('');
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Judul modul harus diisi');
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (customLink.trim()) {
        formData.append('customLink', customLink.trim());
      }
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload gagal');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result?.shortCode) return;
    const url = window.location.origin + '/v/' + result.shortCode;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleReset = () => {
    setTitle('');
    setCustomLink('');
    setFile(null);
    setError('');
    setResult(null);
    setCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Success state
  if (result) {
    const fullUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/v/' + result.shortCode;

    return (
      <>
        <div className="page-header">
          <h1>Upload Modul HTML</h1>
        </div>

        <div className="card" style={{
          maxWidth: 560,
          margin: '0 auto',
          textAlign: 'center',
          padding: '3rem 2rem',
          animation: 'slideUp 0.5s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <SparklesIcon style={{ width: 64, height: 64, color: 'var(--primary-500)' }} />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Upload Berhasil!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Modul <strong>{result.title || title}</strong> telah berhasil diupload.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}>
              Shortlink Modul
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
            }}>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: 'var(--primary-400)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fullUrl}
              </a>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCopyLink}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                {copied ? <CheckIcon style={{ width: 16 }} /> : <ClipboardIcon style={{ width: 16 }} />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpTrayIcon style={{ width: 20 }} /> Upload Lagi
            </button>
            <Link href="/dashboard" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ChartBarSquareIcon style={{ width: 20 }} /> Ke Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Upload Modul HTML</h1>
        <p>Upload file HTML interaktif untuk dibagikan ke siswa melalui shortlink.</p>
      </div>

      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <PencilSquareIcon style={{ width: 20 }} /> Judul Modul <span style={{ color: 'var(--danger-500)' }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="Contoh: Kuis Sistem Tata Surya"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={uploading}
            />
          </div>

          {/* Custom Link Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="customLink" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <LinkIcon style={{ width: 20 }} /> Custom Link <span style={{ color: 'var(--text-muted)' }}>(Opsional)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>ajar.in/v/</span>
              <input
                id="customLink"
                type="text"
                className="form-input"
                placeholder="misal: tata-surya-7a"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={uploading}
                style={{ flex: 1 }}
              />
            </div>
            <div className="form-hint" style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Biarkan kosong untuk generate link acak. Hanya huruf, angka, dan tanda hubung (-).
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <DocumentIcon style={{ width: 20 }} /> File HTML
            </label>
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />

              {file ? (
                <>
                  <div className="upload-zone-icon"><DocumentCheckIcon style={{ width: 48, margin: '0 auto', color: 'var(--primary-500)' }} /></div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {file.name}
                  </div>
                  <div className="upload-zone-hint">
                    {formatFileSize(file.size)} • Klik untuk ganti file
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-zone-icon"><CloudArrowUpIcon style={{ width: 48, margin: '0 auto' }} /></div>
                  <div className="upload-zone-text">
                    <strong>Drag & drop</strong> file HTML di sini
                  </div>
                  <div className="upload-zone-hint">
                    atau klik untuk memilih file • Maks. 5MB • .html / .htm
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger-500)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <ExclamationTriangleIcon style={{ width: 20, flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={uploading || !file || !title.trim()}
          >
            {uploading ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                <span>Mengupload...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon style={{ width: 20 }} />
                <span>Upload Modul</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
