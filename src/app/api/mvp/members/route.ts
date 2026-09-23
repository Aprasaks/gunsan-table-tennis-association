import { NextResponse } from 'next/server';
import { actor, db, publicMember } from '@/lib/mvpServer';
export async function GET() {
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { data, error } = await db().from('mvp_members').select('*').order('name');
    if (error) throw error;
    const users = (data ?? []).map(publicMember);
    return NextResponse.json({ users: current.admin ? users : users.filter((u) =>
      u.id === current.user.id || (current.user.position === '회장' && u.club === current.user.club)) });
  } catch {
    return NextResponse.json({ message: '회원 목록을 불러오지 못했습니다.' }, { status: 503 });
  }
}
