'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { TransferRequest } from '@/lib/mvpTransfer';
import styles from './dashboard.module.css';

type Overview = { members: MvpUser[]; requests: TransferRequest[] };

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!isAdmin(await refreshCurrentUser())) {
          router.replace('/login');
          return;
        }
        const [membersResponse, transfersResponse] = await Promise.all([
          fetch('/api/mvp/members', { cache: 'no-store' }),
          fetch('/api/mvp/transfers', { cache: 'no-store' }),
        ]);
        if (!membersResponse.ok || !transfersResponse.ok) throw new Error('관리자 현황을 불러오지 못했습니다. 데이터베이스 설정을 확인해주세요.');
        const [members, transfers] = await Promise.all([membersResponse.json(), transfersResponse.json()]);
        if (!cancelled) setOverview({ members: members.users, requests: transfers.requests });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '관리자 현황을 불러오지 못했습니다.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  const activeMembers = overview?.members.filter((member) => member.memberStatus !== 'withdrawn') ?? [];
  const officers = activeMembers.filter((member) => Boolean(member.associationTitle));
  const pendingAdmin = overview?.requests.filter((request) => request.status === 'pending_admin') ?? [];
  const pendingDestination = overview?.requests.filter((request) => request.status === 'pending_destination') ?? [];
  const recentMembers = [...(overview?.members ?? [])].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 5);

  return <>
    <section className="subHero"><div className="siteShell subHeroInner">
      <span className="crumb">HOME / 관리자</span><h1>협회 관리자 대시보드</h1>
      <p>회원 명부와 직책, 이적 승인 현황을 확인합니다.</p>
    </div></section>
    <section className="siteShell pageContent">
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!overview && !error && <p role="status">관리자 현황을 불러오는 중입니다.</p>}
      {overview && <>
        <div className={styles.stats}>
          <Link href="/admin/members" className={styles.stat}><span>활동 회원</span><strong>{activeMembers.length}명</strong><small>전체 등록 {overview.members.length}명</small></Link>
          <Link href="/admin/members" className={styles.stat}><span>협회 직책 회원</span><strong>{officers.length}명</strong><small>협회장 · 이사 · 총무 · 고문 · 사무국장</small></Link>
          <Link href="/members/approvals" className={styles.stat}><span>협회 승인 대기</span><strong>{pendingAdmin.length}건</strong><small>목적지 구장 승인 완료</small></Link>
          <Link href="/members/approvals" className={styles.stat}><span>목적지 승인 대기</span><strong>{pendingDestination.length}건</strong><small>구장 회장 확인 단계</small></Link>
        </div>
        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="pending-heading">
            <div className={styles.heading}><h2 id="pending-heading">협회 승인 대기</h2><Link href="/members/approvals">전체 승인 업무 →</Link></div>
            {pendingAdmin.length === 0 ? <p className={styles.empty}>현재 협회 승인 대기 건이 없습니다.</p> :
              pendingAdmin.slice(0, 5).map((request) => <div className={styles.row} key={request.id}>
                <strong>{request.memberName}</strong><span>{request.fromClub} → {request.toClub}</span>
              </div>)}
          </section>
          <section className={styles.panel} aria-labelledby="recent-heading">
            <div className={styles.heading}><h2 id="recent-heading">최근 등록 회원</h2><Link href="/admin/members">전체 회원 명부 →</Link></div>
            {recentMembers.length === 0 ? <p className={styles.empty}>등록된 회원이 없습니다.</p> :
              recentMembers.map((member) => <div className={styles.row} key={member.id}>
                <strong>{member.name}</strong><span>{member.club} · {member.createdAt ? new Date(member.createdAt).toLocaleDateString('ko-KR') : '등록일 미상'}</span>
              </div>)}
          </section>
        </div>
      </>}
      <div className={styles.quickLinks}>
        <Link href="/admin/members">회원 명부와 직책 관리 →</Link>
        <Link href="/members/approvals">이적 승인 업무 →</Link>
        <Link href="/admin/notifications">협회 임원 알림함 →</Link>
        <Link href="/admin/registrations">제출된 선수등록 명단 →</Link>
        <Link href="/notice">공지사항 →</Link>
        <Link href="/schedule">대회정보 →</Link>
      </div>
    </section>
  </>;
}
