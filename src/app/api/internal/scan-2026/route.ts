import { NextRequest, NextResponse } from 'next/server';
import { scanJbtta2026Page } from '@/lib/jbttaCrawler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOKEN = 'scan-2026-9f7c2b11';

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('token') !== TOKEN) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const page = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('page') || 1), 20));
  try {
    const result = await scanJbtta2026Page(page);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'scan failed',
    }, { status: 500 });
  }
}
