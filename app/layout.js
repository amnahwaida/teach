import './globals.css';

export const metadata = {
  title: 'Ajar.in — Platform Hosting & Tracking Media Pembelajaran',
  description: 'Platform shortlink dan hosting media pembelajaran interaktif berbasis HTML. Upload, bagikan, dan rekap nilai siswa secara otomatis.',
  keywords: 'media pembelajaran, kuis interaktif, html hosting, shortlink guru, tracking nilai',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
