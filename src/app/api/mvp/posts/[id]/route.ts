import { NextResponse } from 'next/server';
import { actor, db, logServerError, sameOrigin } from '@/lib/mvpServer';
import { authorKey, postView, validPostInput } from '@/lib/mvpPostsServer';
import {
  materializeUploads,
  normalizePostHtml,
  parseUploadDescriptors,
  postFiles,
  PostFileInputError,
  referencedInlineFileIds,
  removeStoredFiles,
} from '@/lib/postFilesServer';
import { isUuid, MAX_ATTACHMENTS } from '@/lib/postUploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const files = await postFiles(id);
    return NextResponse.json({ post: postView(data, files) });
  } catch (cause) {
    logServerError('[api/mvp/posts/:id] failed to load post', cause);
    return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 503 });
  }
}
export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  let finalized: Awaited<ReturnType<typeof materializeUploads>> | null = null;
  let insertedFileIds: string[] = [];
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { id } = await context.params;
    const { data: existing } = await db().from('mvp_posts').select('*').eq('id', id).single();
    if (!existing || existing.author_key !== authorKey(current) || (existing.kind === 'notice' && !current.admin && !current.user?.associationTitle))
      return NextResponse.json({ message: '수정 권한이 없습니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const existingFiles = await postFiles(id);
    const descriptors = parseUploadDescriptors(body?.newFiles ?? [], id);
    finalized = await materializeUploads(id, descriptors);
    const existingInlineIds = new Set(existingFiles.filter((file) => file.file_kind === 'inline').map((file) => file.id));
    const normalizedHtml = normalizePostHtml(String(body?.contentHtml ?? ''), id, finalized.rows, existingInlineIds);
    const input = validPostInput({ ...body, contentHtml: normalizedHtml });
    if (!input) throw new PostFileInputError('제목과 본문을 확인해주세요.');
    const requestedAttachments = Array.isArray(body?.existingAttachmentIds) ? body.existingAttachmentIds.filter(isUuid) : [];
    if (!Array.isArray(body?.existingAttachmentIds) || requestedAttachments.length !== body.existingAttachmentIds.length || requestedAttachments.length > MAX_ATTACHMENTS || new Set(requestedAttachments).size !== requestedAttachments.length) {
      throw new PostFileInputError('첨부파일은 8개까지 올릴 수 있습니다.');
    }
    const existingAttachmentIds = new Set(existingFiles.filter((file) => file.file_kind === 'attachment').map((file) => file.id));
    if (requestedAttachments.some((fileId: string) => !existingAttachmentIds.has(fileId))) throw new PostFileInputError('첨부파일 정보를 확인해주세요.');
    if (requestedAttachments.length + finalized.rows.filter((file) => file.file_kind === 'attachment').length > MAX_ATTACHMENTS) {
      throw new PostFileInputError('첨부파일은 8개까지 올릴 수 있습니다.');
    }
    if (finalized.rows.length) {
      const { error: insertError } = await db().from('mvp_post_files').insert(finalized.rows);
      if (insertError) throw insertError;
      insertedFileIds = finalized.rows.map((file) => file.id);
    }
    const { data, error } = await db().from('mvp_posts').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (error) throw error;
    const referencedInline = referencedInlineFileIds(input.content_html, id);
    const keepIds = new Set([...requestedAttachments, ...referencedInline, ...finalized.rows.map((file) => file.id)]);
    const removed = existingFiles.filter((file) => !keepIds.has(file.id));
    if (removed.length) {
      const { error: removeRowError } = await db().from('mvp_post_files').delete().eq('post_id', id).in('id', removed.map((file) => file.id));
      if (removeRowError) logServerError('[api/mvp/posts/:id] failed to remove old file records', removeRowError);
      else await removeStoredFiles(removed).catch((cleanupError) => logServerError('[api/mvp/posts/:id] failed to remove old files', cleanupError));
    }
    const allFiles = [...existingFiles.filter((file) => keepIds.has(file.id)), ...finalized.rows];
    return NextResponse.json({ post: postView(data, allFiles) });
  } catch (cause) {
    if (insertedFileIds.length) await db().from('mvp_post_files').delete().in('id', insertedFileIds);
    if (finalized?.rows.length) await removeStoredFiles(finalized.rows).catch((cleanupError) => logServerError('[api/mvp/posts/:id] failed to roll back files', cleanupError));
    if (cause instanceof PostFileInputError) return NextResponse.json({ message: cause.message }, { status: 400 });
    logServerError('[api/mvp/posts/:id] failed to update post', cause);
    return NextResponse.json({ message: '게시글을 수정하지 못했습니다.' }, { status: 503 });
  }
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
    const files = await postFiles(id);
    const { error } = await db().from('mvp_posts').delete().eq('id', id);
    if (error) throw error;
    await removeStoredFiles(files).catch((cleanupError) => logServerError('[api/mvp/posts/:id] failed to remove deleted files', cleanupError));
    return NextResponse.json({ ok: true });
  } catch (cause) {
    logServerError('[api/mvp/posts/:id] failed to delete post', cause);
    return NextResponse.json({ message: '게시글을 삭제하지 못했습니다.' }, { status: 503 });
  }
}
