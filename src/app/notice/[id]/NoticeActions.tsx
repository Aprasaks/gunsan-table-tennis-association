'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = { noticeId: string; canEdit: boolean; canDelete: boolean };

export default function NoticeActions({ noticeId, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function removeNotice() {
    if (!canDelete || deleting || !window.confirm('이 공지사항을 삭제하시겠습니까?\n첨부한 이미지와 파일도 함께 삭제되며 복구할 수 없습니다.')) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch('/api/mvp/posts/' + noticeId, { method: 'DELETE' });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? '공지사항을 삭제하지 못했습니다.');
      router.replace('/notice');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '공지사항을 삭제하지 못했습니다.');
      setDeleting(false);
    }
  }

  return <>
    {error && <p className="noticeActionError" role="alert">{error}</p>}
    <div className="noticeDetailActions">
      <Link href="/notice" className="noticeListButton">목록으로</Link>
      {canEdit && <Link href={'/admin/notice/' + noticeId + '/edit'} className="noticeEditButton">수정</Link>}
      {canDelete && <button type="button" className="noticeDeleteButton" onClick={removeNotice} disabled={deleting}>{deleting ? '삭제 중…' : '삭제'}</button>}
    </div>
  </>;
}
