'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { formatShortDateRange, type Tournament } from '@/lib/tournaments';

export default function SchedulePage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentAdmin = isAdmin(getCurrentUser());
    setAdmin(currentAdmin);

    fetch('/api/tournaments' + (currentAdmin ? '?include_private=1' : ''), { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json() as { items?: Tournament[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? '대회정보를 불러오지 못했습니다.');
        setItems(result.items ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '대회정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 대회일정</span>
        <h1>대회일정</h1>
        <p>군산시탁구협회와 전북특별자치도 주요 탁구대회 일정을 안내합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      {admin && <div className="contentAdminToolbar"><Link href="/admin/schedule/new" className="contentAdminButton">대회정보 등록</Link></div>}

      {loading && <div className="scheduleState">대회일정을 불러오고 있습니다.</div>}
      {error && <div className="scheduleState scheduleStateError">{error}</div>}

      {!loading && !error && (
        <div className="scheduleTableWrap">
          <table className="scheduleTable">
            <thead>
              <tr>
                <th>대회날짜</th>
                <th>대회명</th>
                <th>접수날짜</th>
                <th>대회장소</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="scheduleEmpty">등록된 대회정보가 없습니다.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td className="scheduleDate">{formatShortDateRange(item.eventStartDate, item.eventEndDate)}</td>
                  <td className="scheduleTitle">
                    <Link href={'/schedule/' + item.id}>{item.title}</Link>
                    {admin && item.visibility === 'private' && <span className="schedulePrivate">비공개</span>}
                  </td>
                  <td>{formatShortDateRange(item.registrationStartDate, item.registrationEndDate)}</td>
                  <td>{item.venue}</td>
                  <td><span className={'scheduleStatus scheduleStatus-' + item.status}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </>;
}
