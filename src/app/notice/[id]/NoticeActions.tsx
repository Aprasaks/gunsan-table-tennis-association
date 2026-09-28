'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  noticeId: string;
  canEdit: boolean;
  canDelete: boolean;
};

export default function NoticeActions({ noticeId, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function removeNotice() {
    if (deleting || !window.confirm('이 공지사항을 삭제하시겠습니까?\n첨부한 이미지와 파일도 함께 삭제됩니다.')) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/mvp/posts/${noticeId}`, { method: 'DELETE' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? '공지사항을 삭제하지 못했습니다.');
      router.push('/notice');
      router.refresh();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : '공지사항을 삭제하지 못했습니다.');
      setDeleting(false);
    }
  }

  return <div className="noticeDetailActions">
    <Link href="/notice" className="noticeListButton">목록으로</Link>
    {canEdit ? <Link href={`/admin/notice/${noticeId}/edit`} className="noticeEditButton">수정</Link> : null}
    {canDelete ? <button type="button" className="noticeDeleteButton" onClick={removeNotice} disabled={deleting}>{deleting ? '삭제 중…' : '삭제'}</button> : null}
  </div>;
}
