import { NextResponse } from 'next/server';
import { actor } from '@/lib/mvpServer';
export async function GET() {
  try {
    const current = await actor();
    return current ? NextResponse.json({ user: current.admin ? null : current.user, admin: current.admin }) :
      NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  } catch {
    return NextResponse.json({ message: '계정을 확인하지 못했습니다.' }, { status: 503 });
  }
}
