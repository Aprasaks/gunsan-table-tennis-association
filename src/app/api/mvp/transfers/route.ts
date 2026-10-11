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
    destinationApprovedBy: row.destination_approved_by,
    sourceSignedAt: row.source_signed_at,
  };
}

export async function GET() {
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { data, error } = await db().from('mvp_transfers').select('*')
      .order('requested_at', { ascending: false }).limit(500);
    if (error) throw error;
    // Service-role 결과에서 이용자에게 허용된 신청만 반환한다.
    const rows = current.admin || isAssociationOfficer(current.user) ? data ?? [] :
      (data ?? []).filter((row) => row.member_id === current.user.id ||
        (current.user.position === '회장' && !isPersonalClub(current.user.club) &&
          (row.requested_by === current.user.id || row.source_chair_user_id === current.user.id ||
           row.to_club === current.user.club)));
    const requests = rows.map((row) => {
      const view = transferView(row);
      const maySeeSignature = current.admin || isAssociationOfficer(current.user) ||
        row.source_chair_user_id === current.user.id;
      return maySeeSignature ? view : { ...view, sourceChairSignatureDataUrl: '' };
    });
    return NextResponse.json({ requests });
  } catch (cause) {
    logServerError('[api/mvp/transfers] list failed', cause);
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
      return NextResponse.json({ message: '이적 신청은 기존 소속 동호회 회장만 할 수 있습니다.' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const destination = String(body?.toClub ?? '').trim();
    const rowId = String(body?.draftMemberId ?? '').trim();
    if (!destination || destination.length > 100 || !rowId || rowId.length > 100 ||
        destination === current.user.club || isPersonalClub(destination)) {
      return NextResponse.json({ message: '이적할 선수와 새 소속 동호회를 확인해주세요.' }, { status: 400 });
    }

    const client = db();
    const { data: roster, error: rosterError } = await client.from('mvp_rosters')
      .select('club,draft').eq('club', current.user.club).maybeSingle();
    if (rosterError) throw rosterError;
    if (!roster || roster.club !== current.user.club || roster.draft?.clubName !== current.user.club) {
      return NextResponse.json({ message: '먼저 현재 동호회의 선수등록 명단을 저장해주세요.' }, { status: 400 });
    }

    const players: RegistrationRow[] = Array.isArray(roster.draft?.members) ? roster.draft.members : [];
    const player = players.find((item) => item?.id === rowId);
    if (!player) {
      return NextResponse.json({ message: '기존 소속 선수등록 명단에서 선수를 선택해주세요.' }, { status: 400 });
    }
    const name = String(player.name ?? '').trim();
    const birthDate = String(player.birthDate ?? '').trim();
    const gender = String(player.gender ?? '');
    const rank = String(player.rank ?? '').trim();
    const phone = String(player.phone ?? '').replace(/\D/g, '');
    if (!name || name.length > 80 || !/^\d{6}$/.test(birthDate) ||
        !['남', '여'].includes(gender) || !rank || rank.length > 40 || !/^\d{10,11}$/.test(phone)) {
      return NextResponse.json({ message: '선수 명부에서 성명, 생년월일, 성별, 부수, 연락처를 먼저 완성해주세요.' }, { status: 400 });
    }

    const { data: chairs, error: chairsError } = await client.from('mvp_members')
      .select('id').eq('club', destination).eq('position', '회장').eq('member_status', 'active');
    if (chairsError) throw chairsError;
    if (!chairs?.length) return NextResponse.json({ message: '새 소속 동호회의 회장 계정이 없습니다. 관리자에게 직책 지정을 요청해주세요.' }, { status: 409 });
    if (chairs.length !== 1) return NextResponse.json({ message: '새 소속 회장이 여러 명입니다. 관리자에게 확인해주세요.' }, { status: 409 });

    const { data: pending, error: pendingError } = await client.from('mvp_transfers')
      .select('id').eq('from_club', current.user.club).eq('member_name', name)
      .eq('birth_date', birthDate).in('status', ['pending_source_chair', 'pending_destination', 'pending_admin']).limit(1);
    if (pendingError) throw pendingError;
    if (pending?.length) return NextResponse.json({ message: '이미 처리 대기 중인 이적 신청입니다.' }, { status: 409 });

    // 기존 소속 회장이 신청한다. 이 단계에서는 서명을 사용하거나 소속을 변경하지 않는다.
    const { data: transfer, error: insertError } = await client.from('mvp_transfers').insert({
      member_id: null, requested_by: current.user.id, draft_member_id: rowId,
      birth_date: birthDate, member_name: name, gender, rank, phone,
      from_club: current.user.club, to_club: destination,
      source_chair_user_id: current.user.id, source_chair_name: current.user.name,
      source_chair_signature_data_url: '',
      request_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
      status: 'pending_source_chair',
    }).select('id').single();
    if (insertError) {
      if (insertError.code === '23505') return NextResponse.json({ message: '이미 처리 대기 중인 이적 신청입니다.' }, { status: 409 });
      throw insertError;
    }
    const { error: alertError } = await client.from('mvp_alerts').insert({
      kind: 'transfer', title: '이적 접수 확인 요청',
      detail: name + ': ' + current.user.club + ' → ' + destination,
      target_url: '/members/transfer', recipient_key: chairs[0].id,
    });
    if (alertError) {
      const { error: cleanupError } = await client.from('mvp_transfers').delete().eq('id', transfer.id);
      if (cleanupError) logServerError('[api/mvp/transfers] failed to revert request', cleanupError);
      throw alertError;
    }
    return NextResponse.json({ ok: true, id: transfer.id, status: 'pending_source_chair' }, { status: 201 });
  } catch (cause) {
    logServerError('[api/mvp/transfers] request failed', cause);
    return NextResponse.json({ message: '이적 신청을 저장하지 못했습니다.' }, { status: 503 });
  }
}
