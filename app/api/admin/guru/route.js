const { NextResponse } = require('next/server');
const { prisma } = require('../../../../lib/prisma');
const { requireAuth, hashPassword } = require('../../../../lib/auth');

export async function GET() {
  try {
    await requireAuth('admin');

    const guruList = await prisma.user.findMany({
      where: { role: 'guru' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: { modules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ guru: guruList });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('List guru error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await requireAuth('admin');

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nama, email, dan password wajib diisi' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const guru = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'guru',
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ guru }, { status: 201 });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Create guru error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
