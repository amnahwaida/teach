const { NextResponse } = require('next/server');
const { prisma } = require('../../../../../lib/prisma');

export async function GET(request, { params }) {
  try {
    const { shortCode } = await params;

    if (!shortCode) {
      return NextResponse.json(
        { error: 'Short code diperlukan' },
        { status: 400 }
      );
    }

    const module = await prisma.module.findUnique({
      where: { shortCode },
      select: {
        id: true,
        title: true,
        shortCode: true,
        isActive: true,
      },
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(module);
  } catch (error) {
    console.error('Module info error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
