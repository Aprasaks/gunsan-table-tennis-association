import { NextRequest, NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';
import { authorKey, authorName, postView, validPostInput, type PostKind } from '@/lib/mvpPostsServer';

function kindOf(value: string | null): PostKind | null { return value === 'notice' || value === 'board' ? value : null; }
export async function GET(request: NextRequest) {
  const kind = kindOf(request.nextUrl.searchParams.get('kind'));
  if (!kind) return NextResponse.json({ message: '게시판을 선택해주세요.' }, { status: 400 });
  try {
    const current = await actor();
    let query = db().from('mvp_posts').select('*').eq('kind', kind).order('created_at', { ascending: false }).limit(100);
    if (kind === 'notice' && !(current?.admin || current?.user?.associationTitle)) query = query.eq('visibility', 'public');
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ posts: (data ?? []).map(postView) });
  } catch { return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  const kind = kindOf(request.nextUrl.searchParams.get('kind'));
  if (!kind) return NextResponse.json({ message: '게시판을 선택해주세요.' }, { status: 400 });
  try {
    const current = await actor();
    if (!current || (kind === 'notice' && (current.admin || !current.user.associationTitle)))
      return NextResponse.json({ message: '글쓰기 권한이 없습니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const input = validPostInput(body);
    if (!input) return NextResponse.json({ message: '제목, 본문, 첨부파일 용량을 확인해주세요.' }, { status: 400 });
    const { data, error } = await db().from('mvp_posts').insert({ ...input, kind,
      visibility: kind === 'notice' && body.visibility === 'private' ? 'private' : 'public',
      author_key: authorKey(current), author_name: authorName(current) }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ post: postView(data) }, { status: 201 });
  } catch { return NextResponse.json({ message: '게시글을 저장하지 못했습니다.' }, { status: 503 }); }
}
