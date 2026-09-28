import { NextRequest, NextResponse } from 'next/server';
import { actor, db, logServerError, sameOrigin } from '@/lib/mvpServer';
import { authorKey } from '@/lib/mvpPostsServer';
import { createUploadTokens, parseUploadDescriptors, PostFileInputError } from '@/lib/postFilesServer';
import { isUuid } from '@/lib/postUploads';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const postId = body?.postId;
    const kind = body?.kind === 'notice' || body?.kind === 'board' ? body.kind : null;
    if (!isUuid(postId) || !kind) return NextResponse.json({ message: '게시글 정보를 확인해주세요.' }, { status: 400 });
    if (kind === 'notice' && !current.admin && !current.user.associationTitle) {
      return NextResponse.json({ message: '공지사항 작성 권한이 없습니다.' }, { status: 403 });
    }

    const { data: existing } = await db().from('mvp_posts').select('id,kind,author_key').eq('id', postId).maybeSingle();
    if (existing && (existing.kind !== kind || existing.author_key !== authorKey(current))) {
      return NextResponse.json({ message: '파일 업로드 권한이 없습니다.' }, { status: 403 });
    }
    const files = parseUploadDescriptors(body?.files, postId);
    const uploads = await createUploadTokens(postId, files);
    return NextResponse.json({ uploads });
  } catch (cause) {
    if (cause instanceof PostFileInputError) return NextResponse.json({ message: cause.message }, { status: 400 });
    logServerError('[api/mvp/uploads] failed to prepare upload', cause);
    return NextResponse.json({ message: '파일 업로드를 준비하지 못했습니다.' }, { status: 503 });
  }
}
