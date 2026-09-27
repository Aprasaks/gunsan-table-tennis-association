import { NextResponse } from 'next/server';
import { MEMBER_COOKIE, sameOrigin } from '@/lib/mvpServer';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MEMBER_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
