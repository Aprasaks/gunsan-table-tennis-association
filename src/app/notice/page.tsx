'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { notices } from './data';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { CONTENT_CHANGE_EVENT, getAdminNotices, type AdminNotice } from '@/lib/mvpContent';

export default function NoticePage() {
  const [adminNotices, setAdminNotices] = useState<AdminNotice[]>([]);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const sync = () => {
      const currentUser = getCurrentUser();
      const adminMode = isAdmin(currentUser);
      setAdmin(adminMode);
      setAdminNotices(getAdminNotices().filter((item) => adminMode || item.visibility !== 'private'));
    };
    sync();
    window.addEventListener(CONTENT_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONTENT_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const rows = [...adminNotices, ...notices];

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 공지사항</span>
        <h1>공지사항</h1>
        <p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p>
      </div>
    </section>
    <div className="siteShell pageContent">
      {admin && <div className="contentAdminToolbar"><Link href="/admin/notice/new" className="contentAdminButton">공지사항 작성</Link></div>}
      <table className="dataTable noticeTable">
        <thead>
          <tr>
            <th className="num">번호</th>
            <th>제목</th>
            <th className="date">등록일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => {
            const privateNotice = 'visibility' in r && r.visibility === 'private';
            return <tr key={r.id}>
              <td className="num">{rows.length - index}</td>
              <td>
                <Link href={`/notice/${r.id}`} className="noticeTitleLink">
                  {r.title}
                  {admin && privateNotice && <span className="noticePrivateBadge">비공개</span>}
                </Link>
              </td>
              <td className="date">{r.date}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </>;
}
