import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';
import { canSubmitClubRoster } from '@/lib/mvpAuth';

async function manager() {
  const current = await actor();
  return current && !current.admin && canSubmitClubRoster(current.user) ? current.user : null;
}
export async function GET() {
  try {
    const current = await manager();
    if (!current) return NextResponse.json({ message: '회원등록 담당자 권한이 필요합니다.' }, { status: 403 });
    const { data, error } = await db().from('mvp_rosters').select('draft,saved_at,submitted_at,submitted_snapshot').eq('club', current.club).maybeSingle();
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
    const { data: previous, error: previousError } = await client.from('mvp_rosters').select('manager_id,saved_at,submitted_snapshot,submitted_at').eq('club', current.club).maybeSingle();
    if (previousError) throw previousError;
    // 현재 명부는 클럽 단위 공유. 승인 후 과거 편집창에서 되살릴 수 없도록 버전 비교.
    const expected = body?.expectedSavedAt ?? null;
    if (expected !== (previous?.saved_at ?? null)) {
      return NextResponse.json({ message: '다른 화면에서 선수명부가 변경되었습니다. 새로고침 후 확인해주세요.', conflict: true }, { status: 409 });
    }
    const savedAt = new Date().toISOString();
    const sameSubmission = JSON.stringify(draft) === JSON.stringify(previous?.submitted_snapshot);
    const payload = { club: current.club, draft, saved_at: savedAt,
      ...(submit ? { submitted_at: sameSubmission ? previous?.submitted_at ?? savedAt : savedAt,
        submitted_snapshot: draft } : {}) };
    const result = previous
      ? await client.from('mvp_rosters').update(payload).eq('manager_id', previous.manager_id)
          .eq('saved_at', previous.saved_at).select('saved_at').maybeSingle()
      : await client.from('mvp_rosters').insert({ ...payload, manager_id: current.id }).select('saved_at').single();
    if (result.error?.code === '23505' || (!result.error && !result.data)) {
      return NextResponse.json({ message: '다른 화면에서 명부가 변경되었습니다. 새로고침해주세요.', conflict: true }, { status: 409 });
    }
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, savedAt: result.data?.saved_at ?? savedAt, submittedAt: submit ? payload.submitted_at : previous?.submitted_at ?? null,
      alreadySubmitted: submit && sameSubmission });
  } catch { return NextResponse.json({ message: '회원등록 내역을 저장하지 못했습니다.' }, { status: 503 }); }
}
