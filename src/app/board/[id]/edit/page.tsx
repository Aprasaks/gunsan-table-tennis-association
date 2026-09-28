'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { getCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { BoardPost } from '@/lib/mvpBoard';

export default function BoardEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [post, setPost] = useState<BoardPost | null | undefined>(undefined);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) { router.replace('/login'); return; }
    fetch(`/api/mvp/posts/${params.id}`, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      const loaded = response.ok ? result.post as BoardPost : null;
      if (!loaded) { setPost(null); return; }
      if (loaded.authorId !== current.id) { alert('작성자만 게시글을 수정할 수 있습니다.'); router.replace(`/board/${params.id}`); return; }
      setUser(current);
      setPost(loaded);
    }).catch(() => setPost(null));
  }, [params.id, router]);

  if (post === undefined) return <div className="siteShell pageContent">게시글을 불러오고 있습니다.</div>;
  if (!post || !user) return <div className="siteShell pageContent">게시글을 찾을 수 없습니다.</div>;
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 게시판 / 수정</span><h1>게시글 수정</h1><p>작성한 게시글의 제목, 본문, 이미지, 링크와 첨부파일을 수정합니다.</p></div></section>
    <div className="siteShell pageContent"><PostEditor kind="board" postId={post.id} authorName={post.authorName} initialTitle={post.title} initialContentHtml={post.contentHtml} initialAttachments={post.attachments} method="PATCH" endpoint={`/api/mvp/posts/${post.id}`} successHref={`/board/${post.id}`} cancelHref={`/board/${post.id}`} submitLabel="수정 완료" placeholder="내용을 입력하세요." /></div>
  </>;
}
