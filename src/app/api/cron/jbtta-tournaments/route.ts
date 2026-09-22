import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/adminSession';
import { syncJbttaTournaments } from '@/lib/jbttaCrawler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (secret && header === 'Bearer ' + secret) return true;
  return hasAdminSession();
}

export async function GET(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({ ok: false, error: '자동수집 실행 권한이 없습니다.' }, { status: 401 });
  }

  const manual = await hasAdminSession();
  const pages = manual ? Number(request.nextUrl.searchParams.get('pages') || 1) : 1;
  const maxImports = manual ? Number(request.nextUrl.searchParams.get('max') || 8) : 6;

  try {
    const result = await syncJbttaTournaments({ pages, maxImports });
    return NextResponse.json({ ok: true, source: '전북특별자치도탁구협회', result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : '전북 대회 자동수집에 실패했습니다.',
    }, { status: 500 });
  }
}
