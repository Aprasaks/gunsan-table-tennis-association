'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canReviewAssociation, refreshCurrentUser } from '@/lib/mvpAuth';
import styles from '@/app/members/transfer/transfer.module.css';

type Member = { id: string; name: string; birthDate: string; rank: string; gender: string; phone: string; address: string; registrationType: string };
type Roster = { managerId: string; club: string; clubAddress: string; submittedAt: string; members: Member[] };
export default function RegistrationsPage() {
  const router = useRouter();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    refreshCurrentUser().then(async (current) => {
      if (!canReviewAssociation(current)) { router.replace('/login'); return; }
      try {
        const response = await fetch('/api/mvp/rosters', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setRosters(result.rosters);
      } catch (cause) { setError(cause instanceof Error ? cause.message : '제출 명단을 불러오지 못했습니다.'); }
      finally { setLoaded(true); }
    });
  }, [router]);
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 협회 임원 / 선수등록</span><h1>제출된 선수등록 명단</h1><p>구장 담당자가 협회에 제출한 명단과 희망부 등록을 확인합니다.</p></div></section>
    <section className="siteShell pageContent"><div className={styles.panel}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!loaded && <p role="status">제출 명단을 불러오는 중입니다.</p>}
      {loaded && rosters.length === 0 && !error && <p className={styles.empty}>제출된 명단이 없습니다.</p>}
      <div className={styles.list}>{rosters.map((roster) => <article className={styles.item} key={roster.managerId}>
        <div className={styles.itemTop}><h2>{roster.club}</h2><span className={styles.meta}>제출 {new Date(roster.submittedAt).toLocaleString('ko-KR')}</span></div>
        <p className={styles.meta}>주소 {roster.clubAddress || '미입력'} · 등록 인원 {roster.members.filter((member) => member.name?.trim()).length}명</p>
        <div className={styles.list}>{roster.members.filter((member) => member.name?.trim()).map((member, index) => <div className={styles.route} key={member.id || index}>
          {member.rank?.includes('희망부') && <span className={styles.badge}>희망부 상시등록</span>} {member.name} · {member.gender} · {member.rank} · {member.registrationType}
          <div className={styles.meta}>생년월일 {member.birthDate} · 연락처 {member.phone} · 주소 {member.address}</div>
        </div>)}</div>
      </article>)}</div>
    </div></section>
  </>;
}
