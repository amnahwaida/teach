const { NextResponse } = require('next/server');
const { prisma } = require('../../../lib/prisma');
const { requireAuth } = require('../../../lib/auth');

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role === 'admin') {
      const [totalGuru, totalModules, totalSubmissions, storageResult] = await Promise.all([
        prisma.user.count({ where: { role: 'guru' } }),
        prisma.module.count(),
        prisma.submission.count(),
        prisma.module.aggregate({
          _sum: { fileSizeBytes: true },
        }),
      ]);

      return NextResponse.json({
        totalGuru,
        totalModules,
        totalSubmissions,
        totalStorageBytes: storageResult._sum.fileSizeBytes || 0,
      });
    }

    // Guru stats - only their own data
    const [totalModules, totalSubmissions, storageResult] = await Promise.all([
      prisma.module.count({ where: { userId: user.id } }),
      prisma.submission.count({
        where: {
          module: { userId: user.id },
        },
      }),
      prisma.module.aggregate({
        where: { userId: user.id },
        _sum: { fileSizeBytes: true },
      }),
    ]);

    return NextResponse.json({
      totalModules,
      totalSubmissions,
      totalStorageBytes: storageResult._sum.fileSizeBytes || 0,
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
