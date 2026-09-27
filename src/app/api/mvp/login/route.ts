import { NextResponse } from 'next/server';
import { db, MEMBER_COOKIE, memberToken, passwordDigest, passwordMatches, publicMember, sameOrigin } from '@/lib/mvpServer';
import { ADMIN_COOKIE_NAME } from '@/lib/adminSession';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const phone = String(body?.phone ?? '').replace(/\D/g, '');
  try {
    const { data, error } = await db().from('mvp_members').select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    if (!data || data.member_status !== 'active' || !passwordMatches(String(body?.password ?? ''), data.password_hash)) {
      return NextResponse.json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
    if (/^[0-9a-f]{64}$/.test(data.password_hash)) {
      await db().from('mvp_members').update({ password_hash: passwordDigest(body.password) }).eq('id', data.id);
    }
    const response = NextResponse.json({ ok: true, user: publicMember(data) });
    response.cookies.set(MEMBER_COOKIE, memberToken(data.id), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
    });
    response.cookies.set(ADMIN_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ message: '로그인 서비스를 사용할 수 없습니다.' }, { status: 503 });
  }
}
