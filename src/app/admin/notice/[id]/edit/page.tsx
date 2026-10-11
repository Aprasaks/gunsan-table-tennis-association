'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { isAssociationOfficer, refreshCurrentUser } from '@/lib/mvpAuth';
import type { NoticeVisibility } from '@/lib/mvpContent';
import type { PostAttachment } from '@/lib/postUploads';

type EditableNotice = {
  id: string;
  kind: 'notice' | 'board';
  title: string;
  contentHtml: string;
  visibility: NoticeVisibility;
  authorId: string;
  attachments: PostAttachment[];
};

export default function EditNoticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [notice, setNotice] = useState<EditableNotice | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadNotice() {
      try {
        const current = await refreshCurrentUser();
        if (!active) return;
        if (!isAssociationOfficer(current)) { router.replace('/notice'); return; }
        const response = await fetch('/api/mvp/posts/' + params.id, { cache: 'no-store' });
        const result = await response.json().catch(() => null) as { post?: EditableNotice; message?: string } | null;
        if (!active) return;
        if (!response.ok || !result?.post || result.post.kind !== 'notice') {
          setError(response.ok ? '공지사항을 찾을 수 없습니다.' : result?.message ?? '공지사항을 불러오지 못했습니다.');
          setNotice(null);
          return;
        }
        setNotice(result.post);
      } catch {
        if (active) { setError('공지사항을 불러오지 못했습니다.'); setNotice(null); }
      }
    }
    void loadNotice();
    return () => { active = false; };
  }, [params.id, router]);

  if (notice === undefined) return <div className="siteShell pageContent" role="status">공지사항을 불러오고 있습니다.</div>;
  if (!notice) return <div className="siteShell pageContent"><p className="noticeActionError" role="alert">{error || '공지사항을 찾을 수 없습니다.'}</p><Link href="/notice" className="noticeListButton">목록으로</Link></div>;

  return (
    <div className="siteShell pageContent">
      <div className="noticeEditorHeading"><h1>공지사항 수정</h1><p>내용과 공개 여부를 확인한 뒤 수정 완료를 눌러주세요.</p></div>
      <PostEditor
        kind="notice" postId={notice.id}
        initialTitle={notice.title}
        initialContentHtml={notice.contentHtml}
        initialAttachments={notice.attachments}
        initialVisibility={notice.visibility}
        method="PATCH"
        endpoint={'/api/mvp/posts/' + notice.id}
        successHref={'/notice/' + notice.id}
        cancelHref={'/notice/' + notice.id}
        submitLabel="수정 완료"
        placeholder="공지 내용을 입력하세요."
      />
    </div>
  );
}
