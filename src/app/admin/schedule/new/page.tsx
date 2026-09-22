'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import styles from '../../editor.module.css';

export default function NewSchedulePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
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
    const currentUser = getCurrentUser();
    if (!currentUser || !isAdmin(currentUser)) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  function fileChange(event: ChangeEvent<HTMLInputElement>, type: 'images' | 'attachments') {
    const selected = Array.from(event.target.files ?? []);
    if (type === 'images') setImages(selected);
    else setAttachments(selected);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!form.title.trim() || !form.eventStartDate || !form.venue.trim()) {
      setMessage('대회명, 대회날짜, 대회장소를 입력해주세요.');
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    images.forEach((file) => data.append('guidelineImages', file));
    attachments.forEach((file) => data.append('attachments', file));

    const response = await fetch('/api/tournaments', { method: 'POST', body: data });
    const result = await response.json().catch(() => ({ error: '대회정보를 저장하지 못했습니다.' })) as { item?: { id: string }; error?: string };

    if (!response.ok || !result.item) {
      setMessage(result.error ?? '대회정보를 저장하지 못했습니다.');
      return;
    }

    router.push('/schedule/' + result.item.id);
  }

  if (!ready) return <div className="siteShell pageContent">관리자 권한을 확인하고 있습니다.</div>;

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME / 관리자 / 대회정보 등록</span>
        <h1>대회정보 등록</h1>
        <p>대회 일정과 요강 자료를 등록합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      <form className={styles.wrap} onSubmit={submit}>
        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.row}><label htmlFor="title">대회명</label><input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>

        <div className="scheduleFormGrid">
          <div className={styles.row}><label htmlFor="eventStartDate">대회 시작일</label><input id="eventStartDate" type="date" value={form.eventStartDate} onChange={(e) => setForm({ ...form, eventStartDate: e.target.value })} /></div>
          <div className={styles.row}><label htmlFor="eventEndDate">대회 종료일</label><input id="eventEndDate" type="date" value={form.eventEndDate} onChange={(e) => setForm({ ...form, eventEndDate: e.target.value })} /></div>
          <div className={styles.row}><label htmlFor="registrationStartDate">접수 시작일</label><input id="registrationStartDate" type="date" value={form.registrationStartDate} onChange={(e) => setForm({ ...form, registrationStartDate: e.target.value })} /></div>
          <div className={styles.row}><label htmlFor="registrationEndDate">접수 종료일</label><input id="registrationEndDate" type="date" value={form.registrationEndDate} onChange={(e) => setForm({ ...form, registrationEndDate: e.target.value })} /></div>
        </div>

        <div className={styles.row}><label htmlFor="venue">대회장소</label><input id="venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>

        <div className="scheduleFormGrid">
          <div className={styles.row}>
            <label htmlFor="status">상태</label>
            <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="예정">예정</option><option value="접수중">접수중</option><option value="마감">마감</option><option value="종료">종료</option>
            </select>
          </div>
          <div className={styles.row}>
            <label htmlFor="visibility">공개 설정</label>
            <select id="visibility" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              <option value="public">공개</option><option value="private">비공개</option>
            </select>
          </div>
        </div>

        <div className={styles.row}><label htmlFor="sourceUrl">원문 링크</label><input id="sourceUrl" type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></div>

        <div className={styles.row}>
          <label htmlFor="guidelineImages">요강 이미지</label>
          <input id="guidelineImages" type="file" accept="image/*" multiple onChange={(e) => fileChange(e, 'images')} />
          {images.length > 0 && <p className="scheduleFileHint">{images.map((file) => file.name).join(', ')}</p>}
        </div>

        <div className={styles.row}>
          <label htmlFor="attachments">첨부파일</label>
          <input id="attachments" type="file" multiple onChange={(e) => fileChange(e, 'attachments')} />
          {attachments.length > 0 && <p className="scheduleFileHint">{attachments.map((file) => file.name).join(', ')}</p>}
        </div>

        <div className={styles.actions}>
          <Link href="/schedule" className={styles.cancel}>취소</Link>
          <button type="submit" className={styles.submit}>대회정보 등록</button>
        </div>
      </form>
    </div>
  </>;
}
