'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { formatShortDateRange, type Tournament } from '@/lib/tournaments';

type SyncResponse = {
  ok?: boolean;
  error?: string;
  result?: {
    imported: number;
    skippedExisting: number;
    skippedMissingDate: number;
    failed: Array<{ title: string; reason: string }>;
  };
};

export default function SchedulePage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [error, setError] = useState('');

  async function loadItems(currentAdmin: boolean) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tournaments' + (currentAdmin ? '?include_private=1' : ''), { cache: 'no-store' });
      const result = await response.json() as { items?: Tournament[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? '대회정보를 불러오지 못했습니다.');
      setItems(result.items ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '대회정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const currentAdmin = isAdmin(getCurrentUser());
    setAdmin(currentAdmin);
    void loadItems(currentAdmin);
  }, []);

  async function runSync() {
    setSyncing(true);
    setSyncMessage('');
    try {
      const response = await fetch('/api/cron/jbtta-tournaments?pages=2&max=10', { cache: 'no-store' });
      const result = await response.json() as SyncResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? '자동수집에 실패했습니다.');
      const imported = result.result?.imported ?? 0;
      const existing = result.result?.skippedExisting ?? 0;
      const missing = result.result?.skippedMissingDate ?? 0;
      setSyncMessage('전북 대회 자동수집 완료 · 신규 ' + imported + '건 · 기존 ' + existing + '건' + (missing ? ' · 날짜 확인 실패 ' + missing + '건' : ''));
      await loadItems(true);
    } catch (reason) {
      setSyncMessage(reason instanceof Error ? reason.message : '자동수집에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  }

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 대회일정</span>
        <h1>대회일정</h1>
        <p>군산시탁구협회와 전북특별자치도 주요 탁구대회 일정을 안내합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      {admin && (
        <div className="contentAdminToolbar scheduleAdminToolbar">
          <button type="button" className="contentAdminButton" onClick={runSync} disabled={syncing}>
            {syncing ? '전북 대회 확인 중...' : '전북 대회 자동수집'}
          </button>
          <Link href="/admin/schedule/new" className="contentAdminButton">대회정보 등록</Link>
        </div>
      )}
      {admin && syncMessage && <div className="scheduleSyncMessage">{syncMessage}</div>}

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
