'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { getCurrentUser, type MvpUser } from '@/lib/mvpAuth';

export default function BoardWritePage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [postId, setPostId] = useState('');

  useEffect(() => {
    setPostId(crypto.randomUUID());
    const current = getCurrentUser();
    if (!current) router.replace('/login');
    else setUser(current);
  }, [router]);

  if (!user || !postId) return <div className="siteShell pageContent">로그인 정보를 확인하고 있습니다.</div>;
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 게시판 / 글쓰기</span><h1>게시판 글쓰기</h1><p>{user.name} 회원님 이름으로 게시글이 등록됩니다.</p></div></section>
    <div className="siteShell pageContent"><PostEditor kind="board" postId={postId} authorName={user.name} endpoint="/api/mvp/posts?kind=board" successHref={`/board/${postId}`} cancelHref="/board" submitLabel="게시글 등록" placeholder="내용을 입력하세요." /></div>
  </>;
}
