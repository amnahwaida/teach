const { NextResponse } = require('next/server');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../../../lib/prisma');
const { requireAuth } = require('../../../lib/auth');
const { nanoid } = require('nanoid');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.html', '.htm'];
const VALID_HTML_MARKERS = ['<!doctype html', '<html', '<!DOCTYPE html'];

export async function POST(request) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const customLink = formData.get('customLink');

    if (!file || !title) {
      return NextResponse.json(
        { error: 'File dan judul wajib diisi' },
        { status: 400 }
      );
    }

    // Validate file extension
    const originalName = file.name || '';
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Hanya file .html atau .htm yang diperbolehkan' },
        { status: 400 }
      );
    }

    // Validate file size
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file maksimal 5MB' },
        { status: 400 }
      );
    }

    // Validate HTML content
    const contentStart = buffer.toString('utf-8', 0, 100).trim().toLowerCase();
    const isValidHtml = VALID_HTML_MARKERS.some((marker) =>
      contentStart.startsWith(marker.toLowerCase())
    );
    if (!isValidHtml) {
      return NextResponse.json(
        { error: 'File bukan HTML yang valid' },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file with UUID filename
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Handle custom link or generate short code
    let shortCode = customLink ? customLink.trim() : nanoid(8);
    
    if (customLink) {
      // Validate custom link (alphanumeric and dashes, max 20 chars)
      if (!/^[a-zA-Z0-9-]+$/.test(shortCode)) {
        return NextResponse.json({ error: 'Custom link hanya boleh berisi huruf, angka, dan tanda hubung (-)' }, { status: 400 });
      }
      if (shortCode.length > 20) {
        return NextResponse.json({ error: 'Custom link maksimal 20 karakter' }, { status: 400 });
      }
      
      // Check if already exists
      const existing = await prisma.module.findUnique({
        where: { shortCode }
      });
      if (existing) {
        return NextResponse.json({ error: 'Custom link sudah digunakan, silakan pilih yang lain' }, { status: 409 });
      }
    }

    // Create module record
    const module = await prisma.module.create({
      data: {
        userId: user.id,
        title,
        shortCode,
        filePath: fileName,
        fileSizeBytes: buffer.length,
        isActive: true,
      },
    });

    return NextResponse.json(
      { shortCode, module },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
