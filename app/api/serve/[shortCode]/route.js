const { NextResponse } = require('next/server');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../../../../lib/prisma');

export async function GET(request, { params }) {
  try {
    const { shortCode } = await params;

    const module = await prisma.module.findUnique({
      where: { shortCode },
    });

    if (!module) {
      return new Response('<h1>404 - Modul tidak ditemukan</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (!module.isActive) {
      return new Response('<h1>Modul ini sedang tidak aktif</h1>', {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', module.filePath);

    if (!fs.existsSync(filePath)) {
      return new Response('<h1>File tidak ditemukan</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const htmlContent = fs.readFileSync(filePath, 'utf-8');

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Serve module error:', error);
    return new Response('<h1>Terjadi kesalahan server</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
