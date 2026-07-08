const { NextResponse } = require('next/server');
const { prisma } = require('../../../lib/prisma');

export async function POST(request) {
  try {
    const { moduleId, studentName, studentClass, score, answersJson } = await request.json();

    if (!moduleId || !studentName || !studentClass || score === undefined || score === null) {
      return NextResponse.json(
        { error: 'moduleId, studentName, studentClass, dan score wajib diisi' },
        { status: 400 }
      );
    }

    // Validate moduleId exists
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!module.isActive) {
      return NextResponse.json(
        { error: 'Modul sedang tidak aktif' },
        { status: 403 }
      );
    }

    const submission = await prisma.submission.create({
      data: {
        moduleId,
        studentName,
        studentClass,
        score: parseFloat(score),
        answersJson: answersJson || null,
      },
    });

    return NextResponse.json(
      { message: 'Jawaban berhasil disimpan', submission },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create submission error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
