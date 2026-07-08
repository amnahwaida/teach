import { NextResponse } from 'next/server';
const { getAllPrompts } = require('../../../lib/prompts');

export async function GET() {
  try {
    const prompts = getAllPrompts();
    return NextResponse.json(prompts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal memuat pustaka prompt' },
      { status: 500 }
    );
  }
}
