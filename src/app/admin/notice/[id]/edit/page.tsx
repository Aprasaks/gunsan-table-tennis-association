'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PostEditor from '@/app/PostEditor';
import { isAssociationOfficer, refreshCurrentUser } from '@/lib/mvpAuth';
import type { NoticeVisibility } from '@/lib/mvpContent';
import type { PostAttachment } from '@/lib/postUploads';

type EditableNotice = {
  id: string;
  title: string;
  contentHtml: string;
  visibility: NoticeVisibility;
  authorId: string;
  authorName: string;
  attachments: PostAttachment[];
};

export default function EditNoticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [notice, setNotice] = useState<EditableNotice | null | undefined>(undefined);

  useEffect(() => {
    async function loadNotice() {
      const current = await refreshCurrentUser();
      if (!isAssociationOfficer(current)) {
        router.replace('/login');
        return;
      }
      const response = await fetch(`/api/mvp/posts/${params.id}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      const loaded = response.ok ? result?.post as EditableNotice : null;
      if (!loaded) {
        window.alert('공지사항을 찾을 수 없습니다.');
        router.replace('/notice');
        return;
      }
      setNotice(loaded);
    }
    loadNotice().catch(() => setNotice(null));
  }, [params.id, router]);

  if (notice === undefined) return <div className="siteShell pageContent">공지사항을 불러오고 있습니다.</div>;
  if (!notice) return <div className="siteShell pageContent">공지사항을 찾을 수 없습니다.</div>;

  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 관리자 / 공지사항 수정</span><h1>공지사항 수정</h1><p>공지 내용과 이미지, 링크, 첨부파일을 수정합니다.</p></div></section>
    <div className="siteShell pageContent">
      <PostEditor
        kind="notice"
        postId={notice.id}
        authorName={notice.authorName}
        initialTitle={notice.title}
        initialContentHtml={notice.contentHtml}
        initialAttachments={notice.attachments}
        initialVisibility={notice.visibility}
        method="PATCH"
        endpoint={`/api/mvp/posts/${notice.id}`}
        successHref={`/notice/${notice.id}`}
        cancelHref={`/notice/${notice.id}`}
        submitLabel="수정 완료"
        placeholder="공지 내용을 입력하세요."
      />
    </div>
  </>;
}
