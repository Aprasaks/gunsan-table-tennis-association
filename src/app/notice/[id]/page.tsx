'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { notices, type NoticeItem } from '../data';
import { getAdminNotices } from '@/lib/mvpContent';

export default function NoticeDetailPage(){
  const params = useParams<{ id: string }>();
  const [notice, setNotice] = useState<NoticeItem | null | undefined>(undefined);

  useEffect(() => {
    const staticNotice = notices.find((item) => item.id === params.id);
    if (staticNotice) {
      setNotice(staticNotice);
      return;
    }

    const adminNotice = getAdminNotices().find((item) => item.id === params.id);
    setNotice(adminNotice ?? null);
  }, [params.id]);

  if (notice === undefined) {
    return <div className="siteShell pageContent">공지사항을 불러오고 있습니다.</div>;
  }

  if (!notice) {
    return <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 공지사항</span>
          <h1>공지사항</h1>
          <p>요청하신 공지를 찾을 수 없습니다.</p>
        </div>
      </section>
      <div className="siteShell pageContent noticeDetailWrap">
        <Link href="/notice" className="noticeListButton">목록으로</Link>
      </div>
    </>;
  }

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 공지사항 &gt; 상세</span>
        <h1>공지사항</h1>
        <p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent noticeDetailWrap">
      <article className="noticeDetail">
        <header className="noticeDetailHeader">
          <h2>{notice.title}</h2>
          <div className="noticeDetailMeta">
            <span>등록일</span>
            <time>{notice.date}</time>
          </div>
        </header>
        <div className="noticeDetailBody">
          {notice.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </article>
      <div className="noticeDetailActions">
        <Link href="/notice" className="noticeListButton">목록으로</Link>
      </div>
    </div>
  </>;
}
