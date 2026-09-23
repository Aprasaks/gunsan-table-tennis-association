import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';

export function transferView(row: Record<string, any>) {
  return {
    id: row.id, memberId: row.member_id, memberName: row.member_name,
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
    const { data, error } = await db().from('mvp_transfers').select('*').order('requested_at', { ascending: false });
    if (error) throw error;
    const rows = current.admin || current.user.associationTitle ? data : data?.filter((row) =>
      row.member_id === current.user.id ||
      (current.user.position === '회장' && (row.from_club === current.user.club || row.to_club === current.user.club))
    );
    return NextResponse.json({ requests: (rows ?? []).map(transferView) });
  } catch {
    return NextResponse.json({ message: '이적 신청을 불러오지 못했습니다.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current || (!current.admin && current.user.position !== '회장')) {
      return NextResponse.json({ message: '이적 신청 권한이 없습니다.' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const destination = String(body?.toClub ?? '').trim().slice(0, 100);
    const { data: member } = await db().from('mvp_members').select('*').eq('id', body?.memberId ?? '').single();
    if (!member || member.member_status !== 'active' || !destination || destination === member.club) {
      return NextResponse.json({ message: '회원과 이적 소속을 확인해주세요.' }, { status: 400 });
    }
    if (!current.admin && current.user.club !== member.club) {
      return NextResponse.json({ message: '기존 소속 회원만 신청할 수 있습니다.' }, { status: 403 });
    }
    const { data: chairs, error: chairError } = await db().from('mvp_members').select('*')
      .eq('club', member.club).eq('position', '회장').eq('member_status', 'active');
    if (chairError) throw chairError;
    const chair = current.admin ? chairs?.find((item) => item.signature_data_url) : chairs?.find((item) => item.id === current.user.id);
    if (!chair?.signature_data_url) {
      return NextResponse.json({ message: '기존 소속 회장 서명을 등록한 뒤 신청해주세요.' }, { status: 400 });
    }
    const { data: destinationChair } = await db().from('mvp_members').select('id')
      .eq('club', destination).eq('position', '회장').eq('member_status', 'active').limit(1);
    if (!destinationChair?.length) {
      return NextResponse.json({ message: '이적 소속의 회장 계정이 없습니다.' }, { status: 400 });
    }
    const { error } = await db().from('mvp_transfers').insert({
      member_id: member.id, member_name: member.name, gender: member.gender,
      rank: member.rank, phone: member.phone, from_club: member.club, to_club: destination,
      source_chair_user_id: chair.id, source_chair_name: chair.name,
      source_chair_signature_data_url: chair.signature_data_url,
      request_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: '이적 신청을 저장하지 못했습니다.' }, { status: 503 });
  }
}
