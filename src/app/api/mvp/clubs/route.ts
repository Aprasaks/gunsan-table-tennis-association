import { NextResponse } from 'next/server';
import { actor, db } from '@/lib/mvpServer';
export async function GET() {
  try {
    if (!await actor()) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { data, error } = await db().from('mvp_members').select('club')
      .eq('position', '회장').eq('member_status', 'active');
    if (error) throw error;
    return NextResponse.json({ clubs: [...new Set((data ?? []).map((item) => item.club))].sort() });
  } catch { return NextResponse.json({ message: '구장 목록을 불러오지 못했습니다.' }, { status: 503 }); }
}
