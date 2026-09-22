import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from '@/lib/adminSession';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body?.username?.trim() ?? '';
  const password = body?.password ?? '';
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ ok: false, message: '관리자 비밀번호 환경변수가 설정되지 않았습니다.' }, { status: 503 });
  }

  if (username !== adminUsername || password !== adminPassword) {
    return NextResponse.json({ ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = createAdminSessionToken(username);
  if (!token) return NextResponse.json({ ok: false, message: '관리자 세션을 생성하지 못했습니다.' }, { status: 503 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
