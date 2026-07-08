const { NextResponse } = require('next/server');
const { prisma } = require('../../../../../lib/prisma');
const { requireAuth, hashPassword } = require('../../../../../lib/auth');

export async function PUT(request, { params }) {
  try {
    await requireAuth('admin');

    const { id } = await params;
    const { name, email, status, password } = await request.json();

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Guru tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check email uniqueness if changed
    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 409 }
        );
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (status) updateData.status = status;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const guru = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ guru });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Update guru error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth('admin');

    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Guru tidak ditemukan' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Guru berhasil dihapus' });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Delete guru error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
