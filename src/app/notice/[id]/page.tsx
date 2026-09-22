'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { notices, type NoticeItem } from '../data';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { getAdminNotices, type AdminNotice } from '@/lib/mvpContent';

type NoticeDetail = NoticeItem | AdminNotice;

export default function NoticeDetailPage(){
  const params = useParams<{ id: string }>();
  const [notice, setNotice] = useState<NoticeDetail | null | undefined>(undefined);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const currentAdmin = isAdmin(getCurrentUser());
    setAdmin(currentAdmin);

    const staticNotice = notices.find((item) => item.id === params.id);
    if (staticNotice) {
      setNotice(staticNotice);
      return;
    }

    const adminNotice = getAdminNotices().find((item) => item.id === params.id);
    if (adminNotice?.visibility === 'private' && !currentAdmin) {
      setNotice(null);
      return;
    }
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
          <p>요청하신 공지를 찾을 수 없거나 비공개 상태입니다.</p>
        </div>
      </section>
      <div className="siteShell pageContent noticeDetailWrap">
        <Link href="/notice" className="noticeListButton">목록으로</Link>
      </div>
    </>;
  }

  const richNotice = 'contentHtml' in notice && Boolean(notice.contentHtml);
  const attachments = 'attachments' in notice ? notice.attachments ?? [] : [];
  const privateNotice = 'visibility' in notice && notice.visibility === 'private';

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
          <h2>
            {notice.title}
            {admin && privateNotice && <span className="noticePrivateBadge noticePrivateBadgeDetail">비공개</span>}
          </h2>
          <div className="noticeDetailMeta">
            <span>등록일</span>
            <time>{notice.date}</time>
          </div>
        </header>

        {richNotice ? (
          <div className="noticeDetailBody noticeRichBody" dangerouslySetInnerHTML={{ __html: (notice as AdminNotice).contentHtml ?? '' }} />
        ) : (
          <div className="noticeDetailBody">
            {notice.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="noticeAttachments">
            <strong>첨부파일</strong>
            <ul>
              {attachments.map((file) => (
                <li key={file.id}>
                  <a href={file.dataUrl} download={file.name}>{file.name}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
      <div className="noticeDetailActions">
        <Link href="/notice" className="noticeListButton">목록으로</Link>
      </div>
    </div>
  </>;
}
