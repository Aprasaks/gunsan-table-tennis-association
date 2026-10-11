'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { isAssociationOfficer, refreshCurrentUser } from '@/lib/mvpAuth';

export default function NewNoticePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [postId, setPostId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    refreshCurrentUser().then((current) => {
      if (!active) return;
      if (!isAssociationOfficer(current)) { router.replace('/notice'); return; }
      setPostId(crypto.randomUUID());
      setReady(true);
    }).catch(() => {
      if (active) setError('권한을 확인하지 못했습니다. 다시 접속해주세요.');
    });
    return () => { active = false; };
  }, [router]);

  if (error) return <div className="siteShell pageContent"><p className="noticeActionError" role="alert">{error}</p></div>;
  if (!ready || !postId) return <div className="siteShell pageContent" role="status">작성 권한을 확인하고 있습니다.</div>;
  return (
    <div className="siteShell pageContent">
      <div className="noticeEditorHeading"><h1>공지사항 작성</h1><p>제목과 내용을 작성한 후 등록해주세요.</p></div>
      <PostEditor kind="notice" postId={postId} endpoint="/api/mvp/posts?kind=notice" successHref={'/notice/' + postId} cancelHref="/notice" submitLabel="공지사항 등록" placeholder="공지 내용을 입력하세요." />
    </div>
  );
}
