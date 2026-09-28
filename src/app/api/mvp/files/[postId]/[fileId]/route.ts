import { NextResponse } from 'next/server';
import { actor, db, logServerError } from '@/lib/mvpServer';
import { POST_FILE_BUCKET, isUuid } from '@/lib/postUploads';

export const runtime = 'nodejs';

type Context = { params: Promise<{ postId: string; fileId: string }> };

function contentDisposition(kind: string, name: string) {
  const mode = kind === 'inline' ? 'inline' : 'attachment';
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_').slice(0, 120) || 'file';
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(_request: Request, context: Context) {
  try {
    const { postId, fileId } = await context.params;
    if (!isUuid(postId) || !isUuid(fileId)) return new NextResponse(null, { status: 404 });
    const { data: file } = await db().from('mvp_post_files').select('*').eq('id', fileId).eq('post_id', postId).single();
    if (!file) return new NextResponse(null, { status: 404 });
    const { data: post } = await db().from('mvp_posts').select('kind,visibility').eq('id', postId).single();
    if (!post) return new NextResponse(null, { status: 404 });
    if (post.visibility === 'private') {
      const current = await actor();
      if (!(current?.admin || current?.user?.associationTitle)) return new NextResponse(null, { status: 404 });
    }
    const { data: blob, error } = await db().storage.from(POST_FILE_BUCKET).download(file.storage_path);
    if (error || !blob) return new NextResponse(null, { status: 404 });
    return new NextResponse(blob.stream(), {
      headers: {
        'Content-Type': file.mime_type,
        'Content-Length': String(file.size),
        'Content-Disposition': contentDisposition(file.file_kind, file.stored_name),
        'Cache-Control': post.visibility === 'private' ? 'private, no-store' : 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (cause) {
    logServerError('[api/mvp/files] failed to serve file', cause);
    return new NextResponse(null, { status: 503 });
  }
}
