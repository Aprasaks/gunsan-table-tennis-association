import { NextResponse } from 'next/server';
import { isAssociationOfficer, isPersonalClub } from '@/lib/mvpAuth';
import { actor, db, logServerError, sameOrigin } from '@/lib/mvpServer';

export function transferView(row: Record<string, any>) {
  return {
    id: row.id, memberId: row.member_id, memberName: row.member_name,
    birthDate: row.birth_date ?? '', draftMemberId: row.draft_member_id ?? '',
    requestedBy: row.requested_by ?? '',
    gender: row.gender, rank: row.rank, phone: row.phone,
    fromClub: row.from_club, toClub: row.to_club,
    sourceChairUserId: row.source_chair_user_id,
    sourceChairName: row.source_chair_name,
    sourceChairSignatureDataUrl: row.source_chair_signature_data_url,
    requestDate: row.request_date, requestedAt: row.requested_at,
    status: row.status, processedBy: row.processed_by,
    processedAt: row.processed_at, adminNote: row.admin_note,
    destinationApprovedAt: row.destination_approved_at,
  };
}

export async function GET() {
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    let query = db().from('mvp_transfers').select('*').order('requested_at', { ascending: false }).limit(150);
    if (!current.admin && !isAssociationOfficer(current.user)) {
      const id = current.user.id;
      query = current.user.position === '회장' && !isPersonalClub(current.user.club)
        ? query.or(`requested_by.eq.${id},source_chair_user_id.eq.${id},member_id.eq.${id}`)
        : query.eq('member_id', id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ requests: (data ?? []).map(transferView) });
  } catch (cause) {
    logServerError('[api/mvp/transfers] failed to list transfers', cause);
    return NextResponse.json({ message: '이적 신청을 불러오지 못했습니다.' }, { status: 503 });
  }
}

type RegistrationRow = {
  id?: unknown;
  name?: unknown;
  birthDate?: unknown;
  gender?: unknown;
  rank?: unknown;
  phone?: unknown;
  registrationType?: unknown;
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current || current.admin || current.user.position !== '회장' || isPersonalClub(current.user.club)) {
      return NextResponse.json({ message: '이적 신청은 받는 동호회의 회장만 할 수 있습니다.' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const fromClub = String(body?.fromClub ?? '').trim();
    const draftMemberId = String(body?.draftMemberId ?? '').trim();
    if (!fromClub || fromClub.length > 100 || !draftMemberId || draftMemberId.length > 100 ||
        fromClub === current.user.club || isPersonalClub(fromClub)) {
      return NextResponse.json({ message: '기존 동호회와 이적할 회원을 확인해주세요.' }, { status: 400 });
    }

    const client = db();
    // 선수등록 초안은 로그인 계정과 별개다. 반드시 B회장이 저장한 '이적' 행을 선택한다.
    const { data: roster, error: rosterError } = await client.from('mvp_rosters')
      .select('club,draft').eq('manager_id', current.user.id).maybeSingle();
    if (rosterError) throw rosterError;
    if (!roster || roster.club !== current.user.club || roster.draft?.clubName !== current.user.club) {
      return NextResponse.json({ message: '먼저 새 소속의 선수등록 명단을 저장해주세요.' }, { status: 400 });
    }
    const rows: RegistrationRow[] = Array.isArray(roster.draft?.members) ? roster.draft.members : [];
    const member = rows.find((row) => row?.id === draftMemberId && row.registrationType === '이적');
    if (!member) return NextResponse.json({ message: '회원등록 명단에서 등록구분이 이적인 선수를 선택해주세요.' }, { status: 400 });

    const name = String(member.name ?? '').trim();
    const birthDate = String(member.birthDate ?? '').trim();
    const gender = String(member.gender ?? '');
    const rank = String(member.rank ?? '').trim();
    const phone = String(member.phone ?? '').replace(/\D/g, '');
    if (!name || name.length > 80 || !/^\d{6}$/.test(birthDate) ||
      !['남', '여'].includes(gender) || !rank || rank.length > 40 || !/^\d{10,11}$/.test(phone)) {
      return NextResponse.json({ message: '이적 회원의 성명, 생년월일, 성별, 부수, 연락처를 먼저 완성해주세요.' }, { status: 400 });
    }

    const { data: chairs, error: chairError } = await client.from('mvp_members')
      .select('id,name').eq('club', fromClub).eq('position', '회장').eq('member_status', 'active');
    if (chairError) throw chairError;
    if (!chairs?.length) return NextResponse.json({ message: '기존 동호회 회장 계정이 없습니다. 관리자에게 직책 지정을 요청해주세요.' }, { status: 409 });
    if (chairs.length !== 1) return NextResponse.json({ message: '기존 동호회 회장이 여러 명으로 지정되어 있습니다. 관리자에게 확인해주세요.' }, { status: 409 });
    const chair = chairs[0];

    const { data: pending, error: pendingError } = await client.from('mvp_transfers')
      .select('id').eq('from_club', fromClub).eq('member_name', name)
      .eq('birth_date', birthDate).in('status', ['pending_source_chair', 'pending_admin']).limit(1);
    if (pendingError) throw pendingError;
    if (pending?.length) return NextResponse.json({ message: '이미 처리 대기 중인 이적 신청입니다.' }, { status: 409 });

    const { data: transfer, error } = await client.from('mvp_transfers').insert({
      member_id: null,
      requested_by: current.user.id, draft_member_id: draftMemberId, birth_date: birthDate,
      member_name: name, gender, rank, phone,
      from_club: fromClub, to_club: current.user.club,
      source_chair_user_id: chair.id, source_chair_name: chair.name,
      source_chair_signature_data_url: '',
      request_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
      status: 'pending_source_chair',
    }).select('id').single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ message: '이미 처리 대기 중인 이적 신청입니다.' }, { status: 409 });
      throw error;
    }
    const { error: alertError } = await client.from('mvp_alerts').insert({
      kind: 'transfer', title: '이적 동의 요청',
      detail: `${name} · ${fromClub} → ${current.user.club}`,
      target_url: '/members/transfer',
      recipient_key: chair.id,
    });
    if (alertError) {
      const { error: cleanupError } = await client.from('mvp_transfers').delete().eq('id', transfer.id);
      if (cleanupError) logServerError('[api/mvp/transfers] failed to roll back request after alert failure', cleanupError);
      throw alertError;
    }
    return NextResponse.json({ ok: true, id: transfer.id, status: 'pending_source_chair' }, { status: 201 });
  } catch (cause) {
    logServerError('[api/mvp/transfers] failed to submit transfer', cause);
    return NextResponse.json({ message: '이적 요청을 저장하지 못했습니다.' }, { status: 503 });
  }
}
