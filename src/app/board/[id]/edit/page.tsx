'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { BoardPost } from '@/lib/mvpBoard';

export default function BoardEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [post, setPost] = useState<BoardPost | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const current = await refreshCurrentUser();
        if (!active) return;
        if (!current) { router.replace('/login'); return; }
        const response = await fetch('/api/mvp/posts/' + params.id, { cache: 'no-store' });
        const result = await response.json().catch(() => null) as { post?: BoardPost; message?: string } | null;
        if (!active) return;
        const loaded = response.ok ? result?.post : null;
        if (!loaded || loaded.kind !== 'board') {
          setError(response.ok ? '게시글을 찾을 수 없습니다.' : result?.message ?? '게시글을 찾을 수 없습니다.');
          setPost(null);
          return;
        }
        if (loaded.authorId !== current.id) {
          router.replace('/board/' + params.id);
          return;
        }
        setUser(current);
        setPost(loaded);
      } catch {
        if (active) {
          setError('게시글을 불러오지 못했습니다.');
          setPost(null);
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [params.id, router]);

  if (post === undefined) return <div className="siteShell pageContent" role="status">게시글을 불러오고 있습니다.</div>;
  if (!post || !user) return <div className="siteShell pageContent"><p className="boardDetailError" role="alert">{error || '게시글을 찾을 수 없습니다.'}</p><Link href="/board" className="boardListButton">목록으로</Link></div>;

  return (
    <div className="siteShell pageContent">
      <div className="boardEditorHeading"><h1>게시글 수정</h1><p>내용을 변경한 뒤 수정 완료를 눌러주세요.</p></div>
      <PostEditor kind="board" postId={post.id} authorName={post.authorName} initialTitle={post.title} initialContentHtml={post.contentHtml} initialAttachments={post.attachments} method="PATCH" endpoint={'/api/mvp/posts/' + post.id} successHref={'/board/' + post.id} cancelHref={'/board/' + post.id} submitLabel="수정 완료" placeholder="내용을 입력하세요." />
    </div>
  );
}
