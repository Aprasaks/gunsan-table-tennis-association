'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';

export default function BoardWritePage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [postId, setPostId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    refreshCurrentUser().then((current) => {
      if (!active) return;
      if (!current) { router.replace('/login'); return; }
      setUser(current);
      setPostId(crypto.randomUUID());
    }).catch(() => {
      if (active) setError('로그인 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
    });
    return () => { active = false; };
  }, [router]);

  if (error) return <div className="siteShell pageContent"><p className="boardDetailError" role="alert">{error}</p><Link href="/board" className="boardListButton">목록으로</Link></div>;
  if (!user || !postId) return <div className="siteShell pageContent" role="status">로그인 정보를 확인하고 있습니다.</div>;

  return (
    <div className="siteShell pageContent">
      <div className="boardEditorHeading"><h1>게시글 작성</h1><p>제목과 내용을 작성한 뒤 게시글을 등록해주세요.</p></div>
      <PostEditor kind="board" postId={postId} authorName={user.name} endpoint="/api/mvp/posts?kind=board" successHref={'/board/' + postId} cancelHref="/board" submitLabel="게시글 등록" placeholder="내용을 입력하세요." />
    </div>
  );
}
