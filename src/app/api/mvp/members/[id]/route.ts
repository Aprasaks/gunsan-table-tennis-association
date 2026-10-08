import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { actor, db, passwordDigest, publicMember, sameOrigin, TITLES } from '@/lib/mvpServer';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current?.admin) return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!TITLES.includes(body?.associationTitle) || !['일반', '회장', '총무', '부회장'].includes(body?.position) ||
        !['active', 'withdrawn'].includes(body?.memberStatus)) {
      return NextResponse.json({ message: '직책과 회원 상태를 확인해주세요.' }, { status: 400 });
    }
    const { data, error } = await db().from('mvp_members')
      .update({ association_title: body.associationTitle, position: body.position, member_status: body.memberStatus })
      .eq('id', id).select('*').single();
    if (error || !data) return NextResponse.json({ message: '회원을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ user: publicMember(data) });
  } catch {
    return NextResponse.json({ message: '직책을 저장하지 못했습니다.' }, { status: 503 });
  }
}


export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current?.admin) return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (body?.action !== 'reset-password') return NextResponse.json({ message: '요청을 확인해주세요.' }, { status: 400 });

    const { id } = await context.params;
    const temporaryPassword = 'GT!' + randomBytes(6).toString('hex');
    const { data, error } = await db().from('mvp_members')
      .update({ password_hash: passwordDigest(temporaryPassword) })
      .eq('id', id).select('id').single();
    if (error || !data) return NextResponse.json({ message: '회원을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ ok: true, temporaryPassword });
  } catch {
    return NextResponse.json({ message: '임시 비밀번호를 발급하지 못했습니다.' }, { status: 503 });
  }
}
