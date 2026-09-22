'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import type { Tournament } from '@/lib/tournaments';
import styles from '../../../../admin/editor.module.css';

export default function EditSchedulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Tournament | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    eventStartDate: '',
    eventEndDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    venue: '',
    status: '예정',
    sourceUrl: '',
    visibility: 'public',
  });

  useEffect(() => {
    if (!isAdmin(getCurrentUser())) {
      router.replace('/login');
      return;
    }

    fetch('/api/tournaments/' + params.id + '?include_private=1', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as { item?: Tournament; error?: string };
        if (!response.ok || !result.item) throw new Error(result.error ?? '대회정보를 찾을 수 없습니다.');
        const found = result.item;
        setItem(found);
        setForm({
          title: found.title,
          eventStartDate: found.eventStartDate,
          eventEndDate: found.eventEndDate ?? '',
          registrationStartDate: found.registrationStartDate ?? '',
          registrationEndDate: found.registrationEndDate ?? '',
          venue: found.venue,
          status: found.status,
          sourceUrl: found.sourceUrl ?? '',
          visibility: found.visibility,
        });
      })
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : '대회정보를 찾을 수 없습니다.'));
  }, [params.id, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const response = await fetch('/api/tournaments/' + params.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = await response.json().catch(() => ({ error: '수정하지 못했습니다.' })) as { error?: string };

    if (!response.ok) {
      setMessage(result.error ?? '수정하지 못했습니다.');
      return;
    }

    router.push('/schedule/' + params.id);
  }

  if (!item && !message) return <div className="siteShell pageContent">대회정보를 불러오고 있습니다.</div>;

  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 관리자 / 대회정보 수정</span><h1>대회정보 수정</h1><p>대회 기본정보와 공개 상태를 수정합니다.</p></div></section>
    <div className="siteShell pageContent">
      <form className={styles.wrap} onSubmit={submit}>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.row}><label>대회명</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="scheduleFormGrid">
          <div className={styles.row}><label>대회 시작일</label><input type="date" value={form.eventStartDate} onChange={(e) => setForm({ ...form, eventStartDate: e.target.value })} /></div>
          <div className={styles.row}><label>대회 종료일</label><input type="date" value={form.eventEndDate} onChange={(e) => setForm({ ...form, eventEndDate: e.target.value })} /></div>
          <div className={styles.row}><label>접수 시작일</label><input type="date" value={form.registrationStartDate} onChange={(e) => setForm({ ...form, registrationStartDate: e.target.value })} /></div>
          <div className={styles.row}><label>접수 종료일</label><input type="date" value={form.registrationEndDate} onChange={(e) => setForm({ ...form, registrationEndDate: e.target.value })} /></div>
        </div>
        <div className={styles.row}><label>대회장소</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
        <div className="scheduleFormGrid">
          <div className={styles.row}><label>상태</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>예정</option><option>접수중</option><option>마감</option><option>종료</option></select></div>
          <div className={styles.row}><label>공개 설정</label><select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="public">공개</option><option value="private">비공개</option></select></div>
        </div>
        <div className={styles.row}><label>원문 링크</label><input type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></div>
        <p className="scheduleFileHint">현재 등록된 요강 이미지와 첨부파일은 유지됩니다.</p>
        <div className={styles.actions}><Link href={'/schedule/' + params.id} className={styles.cancel}>취소</Link><button type="submit" className={styles.submit}>수정 완료</button></div>
      </form>
    </div>
  </>;
}
