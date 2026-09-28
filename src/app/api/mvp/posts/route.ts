import { NextRequest, NextResponse } from 'next/server';
import { actor, db, logServerError, sameOrigin } from '@/lib/mvpServer';
import { authorKey, authorName, postView, validPostInput, type PostKind } from '@/lib/mvpPostsServer';
import { materializeUploads, normalizePostHtml, parseUploadDescriptors, PostFileInputError, removeStoredFiles } from '@/lib/postFilesServer';
import { isUuid } from '@/lib/postUploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    return NextResponse.json({ posts: (data ?? []).map((row) => postView(row)) });
  } catch (cause) {
    logServerError('[api/mvp/posts] failed to load posts', cause);
    return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  const kind = kindOf(request.nextUrl.searchParams.get('kind'));
  if (!kind) return NextResponse.json({ message: '게시판을 선택해주세요.' }, { status: 400 });
  let finalized: Awaited<ReturnType<typeof materializeUploads>> | null = null;
  let insertedPost = false;
  try {
    const current = await actor();
    if (!current || (kind === 'notice' && !current.admin && !current.user.associationTitle))
      return NextResponse.json({ message: '글쓰기 권한이 없습니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const postId = body?.id;
    if (!isUuid(postId)) return NextResponse.json({ message: '게시글 정보를 확인해주세요.' }, { status: 400 });
    const rawHtml = String(body?.contentHtml ?? '');
    if (!rawHtml || rawHtml.length > 500_000) return NextResponse.json({ message: '본문을 확인해주세요.' }, { status: 400 });
    const files = parseUploadDescriptors(body?.newFiles ?? [], postId);
    finalized = await materializeUploads(postId, files);
    const contentHtml = normalizePostHtml(rawHtml, postId, finalized.rows, new Set());
    const input = validPostInput({ ...body, contentHtml });
    if (!input) throw new PostFileInputError('제목과 본문을 확인해주세요.');
    const { data, error } = await db().from('mvp_posts').insert({ ...input, id: postId, kind,
      visibility: kind === 'notice' && body.visibility === 'private' ? 'private' : 'public',
      author_key: authorKey(current), author_name: authorName(current) }).select('*').single();
    if (error) throw error;
    insertedPost = true;
    if (finalized.rows.length) {
      const { error: fileError } = await db().from('mvp_post_files').insert(finalized.rows);
      if (fileError) throw fileError;
    }
    return NextResponse.json({ post: postView(data, finalized.rows) }, { status: 201 });
  } catch (cause) {
    if (insertedPost && finalized?.rows[0]?.post_id) await db().from('mvp_posts').delete().eq('id', finalized.rows[0].post_id);
    if (finalized?.rows.length) await removeStoredFiles(finalized.rows).catch((cleanupError) => logServerError('[api/mvp/posts] failed to roll back files', cleanupError));
    if (cause instanceof PostFileInputError) return NextResponse.json({ message: cause.message }, { status: 400 });
    logServerError('[api/mvp/posts] failed to save post', cause);
    return NextResponse.json({ message: '게시글을 저장하지 못했습니다.' }, { status: 503 });
  }
}
