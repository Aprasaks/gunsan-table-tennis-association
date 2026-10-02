'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { TransferRequest } from '@/lib/mvpTransfer';
import styles from './dashboard.module.css';

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  read: boolean;
};

type Overview = {
  members: MvpUser[] | null;
  requests: TransferRequest[];
  alerts: AlertItem[];
  rosterCount: number;
};

const executiveTitles = ['협회장', '총무', '사무국장'];

export default function AdminPage() {
  const router = useRouter();
  const [viewer, setViewer] = useState<MvpUser | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const current = await refreshCurrentUser();
        const admin = isAdmin(current);
        const executive = Boolean(current && executiveTitles.includes(current.associationTitle ?? ''));
        if (!current || (!admin && !executive)) {
          router.replace('/login');
          return;
        }
        if (!cancelled) setViewer(current);

        const [transfersResponse, alertsResponse, rostersResponse, membersResponse] = await Promise.all([
          fetch('/api/mvp/transfers', { cache: 'no-store' }),
          fetch('/api/mvp/alerts', { cache: 'no-store' }),
          fetch('/api/mvp/rosters', { cache: 'no-store' }),
          admin ? fetch('/api/mvp/members', { cache: 'no-store' }) : Promise.resolve(null),
        ]);

        if (!transfersResponse.ok || !alertsResponse.ok || !rostersResponse.ok || (membersResponse && !membersResponse.ok)) {
          throw new Error('협회 운영 현황을 불러오지 못했습니다. 데이터베이스 설정을 확인해주세요.');
        }

        const [transfers, alerts, rosters, members] = await Promise.all([
          transfersResponse.json(),
          alertsResponse.json(),
          rostersResponse.json(),
          membersResponse ? membersResponse.json() : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setOverview({
            members: members?.users ?? null,
            requests: transfers.requests ?? [],
            alerts: alerts.alerts ?? [],
            rosterCount: (rosters.rosters ?? []).length,
          });
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '협회 운영 현황을 불러오지 못했습니다.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  const admin = isAdmin(viewer);
  const activeMembers = overview?.members?.filter((member) => member.memberStatus !== 'withdrawn') ?? [];
  const officers = activeMembers.filter((member) => Boolean(member.associationTitle));
  const pendingAdmin = overview?.requests.filter((request) => request.status === 'pending_admin') ?? [];
  const pendingDestination = overview?.requests.filter((request) => request.status === 'pending_destination') ?? [];
  const unreadAlerts = overview?.alerts.filter((alert) => !alert.read).length ?? 0;

  return <>
    <section className="subHero"><div className="siteShell subHeroInner">
      <span className="crumb">HOME / 협회 임원</span><h1>협회 임원진 대시보드</h1>
      <p>회원 현황과 승인 업무, 선수등록 및 협회 알림을 한곳에서 확인합니다.</p>
    </div></section>
    <section className="siteShell pageContent">
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!overview && !error && <p role="status">협회 운영 현황을 불러오는 중입니다.</p>}
      {overview && <>
        <div className={styles.stats}>
          {admin && <div className={styles.stat}><span>활동 회원</span><strong>{activeMembers.length}명</strong><small>전체 등록 {overview.members?.length ?? 0}명</small></div>}
          {admin && <div className={styles.stat}><span>협회 직책 회원</span><strong>{officers.length}명</strong><small>협회장 · 이사 · 총무 · 고문 · 사무국장</small></div>}
          <Link href="/members/approvals" className={styles.stat}><span>협회 승인 대기</span><strong>{pendingAdmin.length}건</strong><small>협회 확인이 필요한 업무</small></Link>
          <Link href="/members/approvals" className={styles.stat}><span>구장 승인 대기</span><strong>{pendingDestination.length}건</strong><small>구장 확인 단계의 이적 업무</small></Link>
          <Link href="/admin/notifications" className={styles.stat}><span>읽지 않은 알림</span><strong>{unreadAlerts}건</strong><small>회원등록 · 이적 · 희망부 알림</small></Link>
          <Link href="/admin/registrations" className={styles.stat}><span>제출 선수등록</span><strong>{overview.rosterCount}건</strong><small>협회에 제출된 구장별 명단</small></Link>
        </div>
        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="pending-heading">
            <div className={styles.heading}><h2 id="pending-heading">협회 승인 대기</h2><Link href="/members/approvals">전체 승인 업무 →</Link></div>
            {pendingAdmin.length === 0 ? <p className={styles.empty}>현재 협회 승인 대기 건이 없습니다.</p> :
              pendingAdmin.slice(0, 5).map((request) => <div className={styles.row} key={request.id}>
                <strong>{request.memberName}</strong><span>{request.fromClub} → {request.toClub}</span>
              </div>)}
          </section>
          <section className={styles.panel} aria-labelledby="alert-heading">
            <div className={styles.heading}><h2 id="alert-heading">최근 임원 알림</h2><Link href="/admin/notifications">알림함 →</Link></div>
            {overview.alerts.length === 0 ? <p className={styles.empty}>현재 알림이 없습니다.</p> :
              overview.alerts.slice(0, 5).map((alert) => <div className={styles.row} key={alert.id}>
                <strong>{alert.read ? alert.title : '새 알림 · ' + alert.title}</strong>
                <span>{new Date(alert.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>)}
          </section>
        </div>
      </>}
      <div className={styles.quickLinks}>
        {admin && <Link href="/admin/members">회원 명부와 직책 관리 →</Link>}
        <Link href="/members/approvals">이적 승인 업무 →</Link>
        <Link href="/admin/notifications">협회 임원 알림함 →</Link>
        <Link href="/admin/registrations">제출된 선수등록 명단 →</Link>
        <Link href="/notice">공지사항 →</Link>
        <Link href="/schedule">대회정보 →</Link>
      </div>
    </section>
  </>;
}
