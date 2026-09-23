import { NextRequest, NextResponse } from 'next/server';
import { syncJbttaTournaments } from '@/lib/jbttaCrawler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret || authorization !== 'Bearer ' + secret) {
    return NextResponse.json({ ok: false, error: '자동수집 실행 권한이 없습니다.' }, { status: 401 });
  }

  try {
    const result = await syncJbttaTournaments({ pages: 2, maxImports: 10 });
    return NextResponse.json({ ok: true, source: '전북특별자치도탁구협회', result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : '전북 대회 자동수집에 실패했습니다.',
    }, { status: 500 });
  }
}
