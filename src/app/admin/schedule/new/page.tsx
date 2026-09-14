'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { saveAdminSchedule } from '@/lib/mvpContent';
import styles from '../../editor.module.css';

export default function NewSchedulePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('예정');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || !isAdmin(currentUser)) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!date.trim() || !title.trim() || !description.trim()) {
      setMessage('날짜, 대회명, 장소/안내 내용을 모두 입력해주세요.');
      return;
    }

    saveAdminSchedule({
      date: date.trim(),
      title: title.trim(),
      description: description.trim(),
      status,
    });

    router.push('/schedule');
  }

  if (!ready) return <div className="siteShell pageContent">관리자 권한을 확인하고 있습니다.</div>;

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME / 관리자 / 대회정보 등록</span>
        <h1>대회정보 등록</h1>
        <p>대회 일정과 참가 안내를 등록합니다.</p>
      </div>
    </section>
    <div className="siteShell pageContent">
      <form className={styles.wrap} onSubmit={submit}>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.row}>
          <label htmlFor="date">날짜</label>
          <input id="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="예: 10.17" />
        </div>
        <div className={styles.row}>
          <label htmlFor="title">대회명</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="대회명" />
        </div>
        <div className={styles.row}>
          <label htmlFor="description">장소 및 안내</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="장소, 참가방법, 참고사항 등을 입력하세요." />
        </div>
        <div className={styles.row}>
          <label htmlFor="status">상태</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="예정">예정</option>
            <option value="접수중">접수중</option>
            <option value="마감">마감</option>
            <option value="완료">완료</option>
          </select>
        </div>
        <div className={styles.actions}>
          <Link href="/schedule" className={styles.cancel}>취소</Link>
          <button type="submit" className={styles.submit}>대회정보 등록</button>
        </div>
      </form>
    </div>
  </>;
}
