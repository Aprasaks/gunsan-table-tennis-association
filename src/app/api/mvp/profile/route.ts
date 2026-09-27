import { NextResponse } from 'next/server';
import { actor, db, passwordDigest, publicMember, sameOrigin } from '@/lib/mvpServer';
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current || current.admin) return NextResponse.json({ message: '회원 로그인이 필요합니다.' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const phone = String(body?.phone ?? '').replace(/\D/g, '');
    if (!String(body?.name ?? '').trim() || !['남', '여'].includes(body?.gender) || !/^\d{10,11}$/.test(phone)) {
      return NextResponse.json({ message: '기본 정보를 확인해주세요.' }, { status: 400 });
    }
    const updates: Record<string, string> = {
      name: String(body.name).trim().slice(0, 80), gender: body.gender, phone,
    };
    if (body.password) {
      if (String(body.password).length < 8) return NextResponse.json({ message: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
      updates.password_hash = passwordDigest(body.password);
    }
    if (body.signatureDataUrl !== undefined) {
      const signature = String(body.signatureDataUrl);
      if (signature && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 300_000)) {
        return NextResponse.json({ message: '서명 이미지가 올바르지 않습니다.' }, { status: 400 });
      }
      updates.signature_data_url = signature;
    }
    const { data, error } = await db().from('mvp_members').update(updates).eq('id', current.user.id).select('*').single();
    if (error?.code === '23505') return NextResponse.json({ message: '이미 사용 중인 휴대폰번호입니다.' }, { status: 409 });
    if (error || !data) throw error;
    return NextResponse.json({ user: publicMember(data) });
  } catch {
    return NextResponse.json({ message: '정보를 저장하지 못했습니다.' }, { status: 503 });
  }
}
