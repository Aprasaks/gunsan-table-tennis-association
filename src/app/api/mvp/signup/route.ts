import { NextResponse } from 'next/server';
import { db, passwordDigest, sameOrigin } from '@/lib/mvpServer';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const phone = String(body?.phone ?? '').replace(/\D/g, '');
  if (!String(body?.name ?? '').trim() || !/^\d{6}$/.test(body?.birthDate) ||
      !['남', '여'].includes(body?.gender) || !/^\d{10,11}$/.test(phone) ||
      !String(body?.club ?? '').trim() || !String(body?.rank ?? '').trim() ||
      String(body?.password ?? '').length < 8) {
    return NextResponse.json({ message: '필수 정보와 8자 이상의 비밀번호를 확인해주세요.' }, { status: 400 });
  }
  try {
    const { error } = await db().from('mvp_members').insert({
      name: String(body.name).trim().slice(0, 80), birth_date: body.birthDate,
      gender: body.gender, phone, club: String(body.club).trim().slice(0, 100),
      rank: String(body.rank).slice(0, 40), position: '일반', association_title: '',
      password_hash: passwordDigest(body.password),
    });
    if (error?.code === '23505') return NextResponse.json({ message: '이미 가입된 휴대폰번호입니다.' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: '회원가입을 저장하지 못했습니다. 관리자에게 문의해주세요.' }, { status: 503 });
  }
}
