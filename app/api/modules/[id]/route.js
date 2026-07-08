const { NextResponse } = require('next/server');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../../../../lib/prisma');
const { requireAuth } = require('../../../../lib/auth');

export async function GET(request, { params }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    // Guru can only see their own modules
    if (user.role !== 'admin' && module.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    return NextResponse.json({ module });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Get module error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.module.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { title, isActive, shortCode } = await request.json();

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (shortCode !== undefined && shortCode !== existing.shortCode) {
      if (!/^[a-zA-Z0-9-]+$/.test(shortCode)) {
        return NextResponse.json({ error: 'Custom link hanya boleh berisi huruf, angka, dan tanda hubung (-)' }, { status: 400 });
      }
      if (shortCode.length > 20) {
        return NextResponse.json({ error: 'Custom link maksimal 20 karakter' }, { status: 400 });
      }
      const existingCode = await prisma.module.findUnique({
        where: { shortCode }
      });
      if (existingCode) {
        return NextResponse.json({ error: 'Custom link sudah digunakan' }, { status: 409 });
      }
      updateData.shortCode = shortCode;
    }

    const module = await prisma.module.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    return NextResponse.json({ module });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Update module error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.module.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Delete the uploaded file
    const filePath = path.join(process.cwd(), 'uploads', existing.filePath);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsError) {
      console.error('Error deleting file:', fsError);
    }

    await prisma.module.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Modul berhasil dihapus' });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Delete module error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
