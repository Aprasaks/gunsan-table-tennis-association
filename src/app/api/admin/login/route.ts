import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body?.username?.trim() ?? '';
  const password = body?.password ?? '';

  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { ok: false, message: '관리자 비밀번호 환경변수가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  if (username !== adminUsername || password !== adminPassword) {
    return NextResponse.json(
      { ok: false, message: '관리자 아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
