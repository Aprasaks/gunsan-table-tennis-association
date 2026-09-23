import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    if (!(await actor())?.admin) return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.users) || body.users.length > 500) return NextResponse.json({ message: '회원 목록을 확인해주세요.' }, { status: 400 });
    let imported = 0;
    for (const user of body.users) {
      const phone = String(user.phone ?? '').replace(/\D/g, '');
      if (!/^[0-9a-f-]{36}$/.test(String(user.id)) || !/^\d{10,11}$/.test(phone) ||
        !/^[0-9a-f]{64}$/.test(String(user.passwordHash)) || !String(user.name ?? '').trim() ||
        !['남', '여'].includes(user.gender) || !/^\d{6}$/.test(String(user.birthDate)) ||
        !String(user.club ?? '').trim()) continue;
      const { error } = await db().from('mvp_members').insert({
        id: user.id, name: String(user.name).trim().slice(0, 80),
        birth_date: user.birthDate, gender: user.gender, phone,
        club: String(user.club).trim().slice(0, 100), rank: String(user.rank ?? '').slice(0, 40),
        position: ['회장', '총무', '부회장'].includes(user.position) ? user.position : '일반',
        association_title: '', password_hash: user.passwordHash,
        signature_data_url: /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(user.signatureDataUrl ?? '') &&
          user.signatureDataUrl.length <= 300_000 ? user.signatureDataUrl : null,
        member_status: user.memberStatus === 'withdrawn' ? 'withdrawn' : 'active',
      });
      if (!error) imported++;
      else if (error.code !== '23505') throw error;
    }
    let importedRequests = 0;
    if (Array.isArray(body.requests) && body.requests.length <= 500) {
      for (const item of body.requests) {
        if (!String(item.id ?? '').startsWith('transfer-') ||
            !/^[0-9a-f-]{36}$/.test(String(item.memberId)) ||
            !/^[0-9a-f-]{36}$/.test(String(item.sourceChairUserId)) ||
            !['남', '여'].includes(item.gender) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(String(item.requestDate))) continue;
        const { error } = await db().from('mvp_transfers').insert({
          legacy_id: item.id, member_id: item.memberId,
          member_name: String(item.memberName ?? '').slice(0, 80), gender: item.gender,
          rank: String(item.rank ?? '').slice(0, 40), phone: String(item.phone ?? '').slice(0, 20),
          from_club: String(item.fromClub ?? '').slice(0, 100),
          to_club: String(item.toClub ?? '').slice(0, 100),
          source_chair_user_id: item.sourceChairUserId,
          source_chair_name: String(item.sourceChairName ?? '').slice(0, 80),
          source_chair_signature_data_url: String(item.sourceChairSignatureDataUrl ?? '').slice(0, 300_000),
          request_date: item.requestDate,
          status: item.status === 'approved' || item.status === 'rejected' ? item.status : 'pending_destination',
          processed_at: item.processedAt ?? null, admin_note: String(item.adminNote ?? '').slice(0, 1000),
        });
        if (!error) importedRequests++;
        else if (error.code !== '23505' && error.code !== '23503') throw error;
      }
    }
    return NextResponse.json({ imported, importedRequests });
  } catch {
    return NextResponse.json({ message: '기존 회원을 가져오지 못했습니다.' }, { status: 503 });
  }
}
