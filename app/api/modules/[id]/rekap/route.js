const { NextResponse } = require('next/server');
const { prisma } = require('../../../../../lib/prisma');
const { requireAuth } = require('../../../../../lib/auth');

export async function GET(request, { params }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const module = await prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && module.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const submissions = await prisma.submission.findMany({
      where: { moduleId: id },
      orderBy: { submittedAt: 'desc' },
    });

    // Check if CSV format is requested
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (format === 'csv') {
      const csvHeader = 'No,Nama Siswa,Kelas,Skor,Waktu Pengerjaan\n';
      const csvRows = submissions
        .map((sub, index) => {
          const submittedAt = new Date(sub.submittedAt).toLocaleString('id-ID');
          return `${index + 1},"${sub.studentName}","${sub.studentClass}",${sub.score},"${submittedAt}"`;
        })
        .join('\n');

      const csv = csvHeader + csvRows;

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rekap-${module.shortCode}.csv"`,
        },
      });
    }

    return NextResponse.json({
      module: {
        id: module.id,
        title: module.title,
        shortCode: module.shortCode,
      },
      submissions,
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    console.error('Get rekap error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
