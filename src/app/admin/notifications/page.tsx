'use client';
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
  const [confirming, setConfirming] = useState('');
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
  async function confirmAlert(id: string) {
    setConfirming(id);
    setError('');
    try {
      const response = await fetch('/api/mvp/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('알림을 확인 처리하지 못했습니다.');
      setAlerts((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      window.dispatchEvent(new Event('gunsan-tt-alerts-change'));
    } catch {
      setError('알림을 확인 처리하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setConfirming('');
    }
  }
  return <>
    <h1 className="visuallyHidden">협회 임원 알림함</h1>
    <section className="siteShell pageContent"><div className={styles.panel}>
      <div className={styles.head}><div><h2>새 알림 {alerts.filter((item) => !item.read).length}건</h2><p>확인 상태는 임원 계정마다 따로 저장됩니다.</p></div></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!loaded && <p role="status">알림을 불러오는 중입니다.</p>}
      {loaded && alerts.length === 0 && !error && <p className={styles.empty}>현재 알림이 없습니다.</p>}
      <div className={styles.list}>{alerts.map((alert) => <article className={styles.item} key={alert.id}>
        <div className={styles.itemTop}><h3>{!alert.read && <span className={styles.badge}>{alert.kind.startsWith('hope_') ? '긴급 · 희망부' : '새 알림'}</span>} {alert.title}</h3><span className={styles.meta}>{new Date(alert.createdAt).toLocaleString('ko-KR')}</span></div>
        <p>{alert.detail}</p><div className={styles.itemActions}>
          {alert.read ? <span className={styles.meta}>확인 완료</span> :
            <button type="button" disabled={!!confirming} onClick={() => confirmAlert(alert.id)}>
              {confirming === alert.id ? '확인 중…' : '확인'}
            </button>}
        </div>
      </article>)}</div>
    </div></section>
  </>;
}
