'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { CONTENT_CHANGE_EVENT, getAdminSchedules, type AdminSchedule } from '@/lib/mvpContent';

const baseItems: AdminSchedule[] = [
  { id: 'base-1', date: '09.19', title: '2026 군산시 생활체육 탁구대회', description: '군산월명체육관 · 세부 요강 추후 공지', status: '접수중' },
  { id: 'base-2', date: '10.03', title: '동호인리그 10월 정기경기', description: '각 지정 클럽 · 경기별 시간 확인', status: '예정' },
  { id: 'base-3', date: '10.17', title: '군산시탁구협회장배 대회', description: '장소 및 참가방법 추후 공지', status: '예정' },
  { id: 'base-4', date: '11.07', title: '동호인리그 11월 정기경기', description: '각 지정 클럽', status: '예정' },
];

export default function SchedulePage() {
  const [adminItems, setAdminItems] = useState<AdminSchedule[]>([]);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAdminItems(getAdminSchedules());
      setAdmin(isAdmin(getCurrentUser()));
    };
    sync();
    window.addEventListener(CONTENT_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONTENT_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const items = [...adminItems, ...baseItems];

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 대회일정</span>
        <h1>대회일정</h1>
        <p>군산시탁구협회 주관 대회와 주요 행사 일정을 안내합니다.</p>
      </div>
    </section>
    <div className="siteShell pageContent">
      {admin && <div className="contentAdminToolbar"><Link href="/admin/schedule/new" className="contentAdminButton">대회정보 등록</Link></div>}
      <div className="scheduleCards">
        {items.map((item) => <div className="scheduleCard" key={item.id}>
          <div className="dateBig">{item.date}</div>
          <div><h3>{item.title}</h3><p>{item.description}</p></div>
          <span className="status">{item.status}</span>
        </div>)}
      </div>
    </div>
  </>;
}
