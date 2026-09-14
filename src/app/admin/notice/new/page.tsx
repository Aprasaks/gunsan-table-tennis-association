'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { saveAdminNotice } from '@/lib/mvpContent';
import styles from '../../editor.module.css';

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export default function NewNoticePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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

    if (!title.trim() || !content.trim()) {
      setMessage('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const item = saveAdminNotice({
      title: title.trim(),
      date: today(),
      content: content.split('\n').map((line) => line.trim()).filter(Boolean),
    });

    router.push(`/notice/${item.id}`);
  }

  if (!ready) return <div className="siteShell pageContent">관리자 권한을 확인하고 있습니다.</div>;

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME / 관리자 / 공지사항 작성</span>
        <h1>공지사항 작성</h1>
        <p>협회 공식 공지를 작성해 공개합니다.</p>
      </div>
    </section>
    <div className="siteShell pageContent">
      <form className={styles.wrap} onSubmit={submit}>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.row}>
          <label htmlFor="title">제목</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지사항 제목" />
        </div>
        <div className={styles.row}>
          <label htmlFor="content">내용</label>
          <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="공지 내용을 입력하세요. 줄바꿈은 문단으로 표시됩니다." />
        </div>
        <div className={styles.actions}>
          <Link href="/notice" className={styles.cancel}>취소</Link>
          <button type="submit" className={styles.submit}>공지 등록</button>
        </div>
      </form>
    </div>
  </>;
}
