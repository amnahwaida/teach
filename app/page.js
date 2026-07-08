import Link from 'next/link';
import { getCurrentUser } from '../lib/auth';
import {
  RocketLaunchIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default async function Home() {
  const user = await getCurrentUser();
  const targetUrl = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login';
  const buttonText = user ? 'Ke Dashboard' : 'Mulai Sekarang';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-primary)', 
      color: 'var(--text-primary)',
      overflowX: 'hidden' 
    }}>
      {/* Navigation */}
      <nav style={{
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '1.25rem', color: 'white',
            boxShadow: 'var(--shadow-glow)'
          }}>A</div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Ajar.in
          </span>
        </div>
        <div>
          <Link href={targetUrl} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: '999px' }}>
            {user ? 'Dashboard' : 'Masuk / Daftar'}
          </Link>
        </div>
      </nav>

      <main>
        <style>{`
          .feature-card {
            transition: transform 0.3s ease;
          }
          .feature-card:hover {
            transform: translateY(-10px);
          }
        `}</style>
        {/* Hero Section */}
        <section style={{
          position: 'relative',
          padding: '8rem 2rem 6rem',
          textAlign: 'center',
          overflow: 'hidden'
        }}>
          {/* Background Orbs (Glassmorphism effect) */}
          <div style={{ position: 'absolute', top: '-20%', left: '10%', width: '50vw', height: '50vw', maxWidth: '600px', maxHeight: '600px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: '40vw', height: '40vw', maxWidth: '500px', maxHeight: '500px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
          
          <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-400)', padding: '0.5rem 1.25rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <SparklesIcon style={{ width: 18 }} /> Platform Modul Pembelajaran Masa Depan
            </div>
            
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '-0.025em' }}>
              Ubah Modul HTML Biasa Menjadi <span className="text-gradient">Luar Biasa</span>
            </h1>
            
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
              Ajar.in memudahkan guru mengunggah modul pembelajaran interaktif, membagikannya melalui custom link, dan otomatis merekam nilai siswa secara real-time.
            </p>
            
            <Link href={targetUrl} className="btn btn-primary btn-lg" style={{ 
              borderRadius: '999px', 
              padding: '1rem 2.5rem', 
              fontSize: '1.125rem', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              boxShadow: 'var(--shadow-glow)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <RocketLaunchIcon style={{ width: 24 }} /> {buttonText}
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: '6rem 2rem', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(30, 41, 59, 0.3) 100%)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Fitur Unggulan</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '1.1rem' }}>Dirancang khusus untuk memudahkan kegiatan belajar mengajar secara interaktif.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div className="card feature-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ width: 72, height: 72, margin: '0 auto 1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>
                  <BoltIcon style={{ width: 36 }} />
                </div>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem', fontWeight: 700 }}>Cepat & Mudah</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>Upload file HTML Anda dalam hitungan detik. Tanpa konfigurasi rumit, langsung siap digunakan.</p>
              </div>

              <div className="card feature-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ width: 72, height: 72, margin: '0 auto 1.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-400)', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
                  <DevicePhoneMobileIcon style={{ width: 36 }} />
                </div>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem', fontWeight: 700 }}>Akses Fleksibel</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>Siswa bisa membuka modul di perangkat apa pun melalui custom link pendek yang mudah diingat.</p>
              </div>

              <div className="card feature-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ width: 72, height: 72, margin: '0 auto 1.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-500)', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}>
                  <ChartBarIcon style={{ width: 36 }} />
                </div>
                <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem', fontWeight: 700 }}>Rekap Otomatis</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>Nilai yang didapat siswa dari kuis otomatis tercatat di dashboard untuk direkap guru.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '3rem 2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: 'white' }}>A</div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ajar.in</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Ajar.in. Semua hak cipta dilindungi.</p>
      </footer>
    </div>
  );
}
