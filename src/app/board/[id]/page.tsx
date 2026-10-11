'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { BoardPost } from '@/lib/mvpBoard';
import RichContentViewer from '@/app/RichContentViewer';

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BoardPost | null | undefined>(undefined);
  const [user, setUser] = useState<MvpUser | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setPost(undefined);
    setLoadError('');
    setActionError('');

    fetch('/api/mvp/posts/' + params.id, { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      const result = await response.json().catch(() => null) as { post?: BoardPost; message?: string } | null;
      if (controller.signal.aborted) return;
      if (response.status === 404 || result?.post?.kind !== 'board' && response.ok) { setPost(null); return; }
      if (!response.ok) throw new Error(result?.message ?? '게시글을 불러오지 못했습니다.');
      setPost(result?.post ?? null);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setPost(null);
      setLoadError(cause instanceof Error ? cause.message : '게시글을 불러오지 못했습니다.');
    });

    refreshCurrentUser().then((current) => {
      if (!controller.signal.aborted) setUser(current);
    }).catch(() => {
      if (!controller.signal.aborted) setUser(null);
    });

    return () => controller.abort();
  }, [params.id]);

  async function removePost() {
    if (!post || post.kind !== 'board' || !user || deleting) return;
    if (post.authorId !== user.id && !isAdmin(user)) return;
    if (!window.confirm('이 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) return;

    setDeleting(true);
    setActionError('');
    try {
      const response = await fetch('/api/mvp/posts/' + post.id, { method: 'DELETE' });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? '게시글을 삭제하지 못했습니다.');
      router.replace('/board');
      router.refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '게시글을 삭제하지 못했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  if (post === undefined) return <div className="siteShell pageContent" role="status">게시글을 불러오고 있습니다.</div>;

  if (!post) {
    return (
      <div className="siteShell pageContent boardDetailWrap">
        <h1 className="boardMissing">{loadError || '게시글을 찾을 수 없습니다.'}</h1>
        <Link href="/board" className="boardListButton">목록으로</Link>
      </div>
    );
  }

  const isOwner = Boolean(user && user.id === post.authorId);
  const canDelete = Boolean(user && (isOwner || isAdmin(user)));

  return (
    <div className="siteShell pageContent boardDetailWrap">
      <article className="boardDetail">
        <header className="boardDetailHeader">
          <h1>{post.title}</h1>
          <div className="boardDetailMeta">
            <span><strong>작성자</strong> {post.authorName}</span>
            <span><strong>등록일</strong> <time dateTime={post.createdAt.slice(0, 10)}>{post.date}</time></span>
            {post.updatedAt && new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime() + 1000 && <span>수정된 글</span>}
          </div>
        </header>

        <RichContentViewer html={post.contentHtml} className="boardDetailBody" />

        {post.attachments.length > 0 && (
          <div className="boardAttachments">
            <strong>첨부파일</strong>
            <ul>
              {post.attachments.map((file) => (
                <li key={file.id}><a href={file.url || file.dataUrl} download={file.name}>{file.name}</a></li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {actionError && <p className="boardDetailError" role="alert">{actionError}</p>}
      <div className="boardDetailActions">
        <Link href="/board" className="boardListButton">목록으로</Link>
        {isOwner && <Link href={'/board/' + post.id + '/edit'} className="boardEditButton">수정</Link>}
        {canDelete && <button type="button" className="boardDeleteButton" onClick={removePost} disabled={deleting}>{deleting ? '삭제 중…' : '삭제'}</button>}
      </div>
    </div>
  );
}
