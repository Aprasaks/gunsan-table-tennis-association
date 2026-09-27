import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';

async function manager() {
  const current = await actor();
  return current && !current.admin && ['회장', '부회장', '총무'].includes(current.user.position) ? current.user : null;
}
export async function GET() {
  try {
    const current = await manager();
    if (!current) return NextResponse.json({ message: '회원등록 담당자 권한이 필요합니다.' }, { status: 403 });
    const { data, error } = await db().from('mvp_rosters').select('draft,saved_at,submitted_at,submitted_snapshot').eq('manager_id', current.id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ draft: data?.draft ?? null, savedAt: data?.saved_at ?? null, submittedAt: data?.submitted_at ?? null,
      submittedSnapshot: data?.submitted_snapshot ?? null });
  } catch { return NextResponse.json({ message: '회원등록 내역을 불러오지 못했습니다.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await manager();
    if (!current) return NextResponse.json({ message: '회원등록 담당자 권한이 필요합니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const draft = body?.draft;
    if (!draft || draft.clubName !== current.club || !Array.isArray(draft.members) || draft.members.length > 200 || JSON.stringify(draft).length > 200_000)
      return NextResponse.json({ message: '소속 또는 등록 명단을 확인해주세요.' }, { status: 400 });
    const submit = body.action === 'submit';
    if (submit && (!draft.clubAddress || !draft.members.some((member: any) => String(member.name ?? '').trim()) ||
      draft.members.filter((member: any) => String(member.name ?? '').trim()).some((member: any) =>
        !member.birthDate || !['남','여'].includes(member.gender) || !member.rank || !member.address || !member.phone)))
      return NextResponse.json({ message: '필수 회원 정보를 입력해주세요.' }, { status: 400 });
    const client = db();
    const { data: previous, error: previousError } = await client.from('mvp_rosters').select('submitted_snapshot,submitted_at').eq('manager_id', current.id).maybeSingle();
    if (previousError) throw previousError;
    const savedAt = new Date().toISOString();
    const payload = { manager_id: current.id, club: current.club, draft, saved_at: savedAt,
      ...(submit ? { submitted_at: JSON.stringify(draft) === JSON.stringify(previous?.submitted_snapshot) ? previous?.submitted_at ?? savedAt : savedAt,
        submitted_snapshot: draft } : {}) };
    const { error } = previous
      ? await client.from('mvp_rosters').update(payload).eq('manager_id', current.id)
      : await client.from('mvp_rosters').insert(payload);
    if (error) throw error;
    return NextResponse.json({ ok: true, savedAt, submittedAt: submit ? payload.submitted_at : previous?.submitted_at ?? null,
      alreadySubmitted: submit && JSON.stringify(draft) === JSON.stringify(previous?.submitted_snapshot) });
  } catch { return NextResponse.json({ message: '회원등록 내역을 저장하지 못했습니다.' }, { status: 503 }); }
}
