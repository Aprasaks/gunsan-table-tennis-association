import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';
import { authorKey, postView, validPostInput } from '@/lib/mvpPostsServer';

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { data, error } = await db().from('mvp_posts').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ message: '게시글이 없습니다.' }, { status: 404 });
    if (data.visibility === 'private') {
      const current = await actor();
      if (!(current?.admin || current?.user?.associationTitle)) return NextResponse.json({ message: '게시글이 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ post: postView(data) });
  } catch { return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 503 }); }
}
export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { id } = await context.params;
    const { data: existing } = await db().from('mvp_posts').select('*').eq('id', id).single();
    if (!existing || existing.author_key !== authorKey(current) || (existing.kind === 'notice' && !current.user?.associationTitle))
      return NextResponse.json({ message: '수정 권한이 없습니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const input = validPostInput(body);
    if (!input) return NextResponse.json({ message: '제목과 본문을 확인해주세요.' }, { status: 400 });
    const { data, error } = await db().from('mvp_posts').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ post: postView(data) });
  } catch { return NextResponse.json({ message: '게시글을 수정하지 못했습니다.' }, { status: 503 }); }
}
export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { id } = await context.params;
    const { data: existing } = await db().from('mvp_posts').select('kind,author_key').eq('id', id).single();
    if (!existing || (existing.author_key !== authorKey(current) && !current.admin))
      return NextResponse.json({ message: '삭제 권한이 없습니다.' }, { status: 403 });
    const { error } = await db().from('mvp_posts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ message: '게시글을 삭제하지 못했습니다.' }, { status: 503 }); }
}
