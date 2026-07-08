const { NextResponse } = require('next/server');
const { prisma } = require('../../../lib/prisma');
const { requireAuth } = require('../../../lib/auth');

export async function GET() {
  try {
    const user = await requireAuth();

    const where = user.role === 'admin' ? {} : { userId: user.id };

    const modules = await prisma.module.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ modules });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('List modules error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
