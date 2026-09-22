'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { formatFullDateRange, type Tournament } from '@/lib/tournaments';

export default function ScheduleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Tournament | null | undefined>(undefined);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentAdmin = isAdmin(getCurrentUser());
    setAdmin(currentAdmin);
    fetch('/api/tournaments/' + params.id + (currentAdmin ? '?include_private=1' : ''), { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as { item?: Tournament; error?: string };
        if (!response.ok || !result.item) throw new Error(result.error ?? '대회정보를 찾을 수 없습니다.');
        setItem(result.item);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : '대회정보를 찾을 수 없습니다.');
        setItem(null);
      });
  }, [params.id]);

  async function remove() {
    if (!item || !admin || !confirm('이 대회정보를 삭제하시겠습니까?')) return;
    const response = await fetch('/api/tournaments/' + item.id, { method: 'DELETE' });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: '삭제하지 못했습니다.' })) as { error?: string };
      alert(result.error ?? '삭제하지 못했습니다.');
      return;
    }
    router.push('/schedule');
  }

  if (item === undefined) return <div className="siteShell pageContent">대회정보를 불러오고 있습니다.</div>;
  if (!item) return <div className="siteShell pageContent">{error || '대회정보를 찾을 수 없습니다.'}</div>;

  const images = item.files.filter((file) => file.fileKind === 'guideline_image');
  const attachments = item.files.filter((file) => file.fileKind === 'attachment');

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 대회일정 &gt; 상세</span>
        <h1>대회일정</h1>
        <p>대회 요강과 첨부자료를 확인합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent scheduleDetailWrap">
      <article className="scheduleDetail">
        <header>
          <div className="scheduleDetailTitleRow">
            <h2>{item.title}</h2>
            <span className={'scheduleStatus scheduleStatus-' + item.status}>{item.status}</span>
          </div>
          <dl className="scheduleInfoGrid">
            <div><dt>대회날짜</dt><dd>{formatFullDateRange(item.eventStartDate, item.eventEndDate)}</dd></div>
            <div><dt>접수날짜</dt><dd>{formatFullDateRange(item.registrationStartDate, item.registrationEndDate)}</dd></div>
            <div><dt>대회장소</dt><dd>{item.venue}</dd></div>
          </dl>
        </header>

        {images.length > 0 && (
          <section className="scheduleGuidelines">
            <h3>대회 요강</h3>
            {images.map((file) => <img key={file.id} src={file.publicUrl} alt={item.title + ' 요강 이미지'} />)}
          </section>
        )}

        {attachments.length > 0 && (
          <section className="scheduleAttachments">
            <h3>첨부파일</h3>
            <ul>{attachments.map((file) => <li key={file.id}><a href={file.publicUrl} download>{file.fileName}</a></li>)}</ul>
          </section>
        )}

        {item.sourceUrl && <div className="scheduleSource"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">전북특별자치도탁구협회 원문 보기</a></div>}
      </article>

      <div className="scheduleDetailActions">
        <Link href="/schedule" className="scheduleActionButton">목록으로</Link>
        {admin && <Link href={'/admin/schedule/' + item.id + '/edit'} className="scheduleActionButton scheduleEditButton">수정</Link>}
        {admin && <button type="button" className="scheduleActionButton scheduleDeleteButton" onClick={remove}>삭제</button>}
      </div>
    </div>
  </>;
}
