'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canReviewAssociation, refreshCurrentUser } from '@/lib/mvpAuth';
import styles from '@/app/members/transfer/transfer.module.css';

type Alert = { id: string; kind: string; title: string; detail: string; targetUrl: string; createdAt: string; read: boolean };
export default function OfficerNotificationsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const sync = useCallback(async () => {
    try {
      const response = await fetch('/api/mvp/alerts', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setAlerts(result.alerts); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '알림을 불러오지 못했습니다.'); }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => {
    refreshCurrentUser().then((user) => { if (!canReviewAssociation(user)) router.replace('/login'); else sync(); });
    const interval = window.setInterval(sync, 15000);
    return () => window.clearInterval(interval);
  }, [router, sync]);
  async function read(id: string) {
    const response = await fetch('/api/mvp/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (response.ok) setAlerts((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    else setError('알림을 읽음 처리하지 못했습니다.');
  }
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 협회 임원 / 알림함</span><h1>협회 임원 알림함</h1><p>희망부 신규 가입·선수등록과 협회 이적 승인 대기를 함께 확인합니다.</p></div></section>
    <section className="siteShell pageContent"><div className={styles.panel}>
      <div className={styles.head}><div><h2>새 알림 {alerts.filter((item) => !item.read).length}건</h2><p>읽음 상태는 임원 계정마다 따로 저장됩니다.</p></div></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!loaded && <p role="status">알림을 불러오는 중입니다.</p>}
      {loaded && alerts.length === 0 && !error && <p className={styles.empty}>현재 알림이 없습니다.</p>}
      <div className={styles.list}>{alerts.map((alert) => <article className={styles.item} key={alert.id}>
        <div className={styles.itemTop}><h3>{!alert.read && <span className={styles.badge}>{alert.kind.startsWith('hope_') ? '긴급 · 희망부' : '새 알림'}</span>} {alert.title}</h3><span className={styles.meta}>{new Date(alert.createdAt).toLocaleString('ko-KR')}</span></div>
        <p>{alert.detail}</p><div className={styles.itemActions}>
          <Link href={alert.targetUrl} onClick={async (event) => {
            if (alert.read) return;
            event.preventDefault();
            await read(alert.id);
            router.push(alert.targetUrl);
          }}>관련 업무 보기 →</Link>
          {!alert.read && <button type="button" onClick={() => read(alert.id)}>읽음 표시</button>}
        </div>
      </article>)}</div>
    </div></section>
  </>;
}
