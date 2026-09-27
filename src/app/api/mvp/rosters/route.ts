import { NextResponse } from 'next/server';
import { actor, db } from '@/lib/mvpServer';

export async function GET() {
  try {
    const current = await actor();
    if (!current || (!current.admin && !current.user.associationTitle))
      return NextResponse.json({ message: '협회 임원 권한이 필요합니다.' }, { status: 403 });
    const { data, error } = await db().from('mvp_rosters')
      .select('manager_id,club,submitted_at,submitted_snapshot').not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ rosters: (data ?? []).map((row) => ({
      managerId: row.manager_id, club: row.club, submittedAt: row.submitted_at,
      clubAddress: row.submitted_snapshot?.clubAddress ?? '',
      members: row.submitted_snapshot?.members ?? [],
    })) });
  } catch { return NextResponse.json({ message: '제출 명단을 불러오지 못했습니다.' }, { status: 503 }); }
}
