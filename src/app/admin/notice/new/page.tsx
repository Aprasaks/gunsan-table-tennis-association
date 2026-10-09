'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { isAssociationOfficer, refreshCurrentUser } from '@/lib/mvpAuth';

export default function NewNoticePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [postId, setPostId] = useState('');

  useEffect(() => {
    setPostId(crypto.randomUUID());
    refreshCurrentUser().then((current) => {
      if (!isAssociationOfficer(current)) router.replace('/notice');
      else setReady(true);
    });
  }, [router]);

  if (!ready || !postId) return <div className="siteShell pageContent">관리자 권한을 확인하고 있습니다.</div>;
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 관리자 / 공지사항 작성</span><h1>공지사항 작성</h1><p>협회 공식 공지를 작성합니다.</p></div></section>
    <div className="siteShell pageContent"><PostEditor kind="notice" postId={postId} endpoint="/api/mvp/posts?kind=notice" successHref={`/notice/${postId}`} cancelHref="/notice" submitLabel="공지 등록" placeholder="공지 내용을 입력하세요." /></div>
  </>;
}
