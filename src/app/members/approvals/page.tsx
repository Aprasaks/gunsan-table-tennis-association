'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canReviewAssociation, isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { TransferRequest } from '@/lib/mvpTransfer';
import styles from '../transfer/transfer.module.css';

const statusLabel: Record<string, string> = {
  pending_destination: '새 소속 승인 대기', pending_admin: '협회 승인 대기',
  approved: '이적 완료', rejected: '반려',
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [downloading, setDownloading] = useState('');
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');

  const sync = useCallback(async () => {
    try {
      const response = await fetch('/api/mvp/transfers', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setRequests(result.requests);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '승인 목록을 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    refreshCurrentUser().then((currentUser) => {
      if (!currentUser) { router.replace('/login'); return; }
      setUser(currentUser); sync();
    });
    const refresh = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(sync, 15000);
    return () => { document.removeEventListener('visibilitychange', refresh); window.clearInterval(interval); };
  }, [router, sync]);

  async function download(request: TransferRequest, kind: 'consent' | 'application') {
    const key = request.id + kind;
    setDownloading(key);
    try {
      const response = await fetch('/api/transfer/hwp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, requestId: request.id }) });
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = kind === 'consent' ? request.memberName + '_이적동의서.hwp' : request.memberName + '_이적_소속변경신청서.hwp';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch { setMessage('한글파일을 생성하지 못했습니다.'); }
    finally { setDownloading(''); }
  }

  async function process(request: TransferRequest, action: 'destination' | 'approve' | 'reject') {
    if (action === 'approve' && !confirm(request.memberName + ' 회원의 이적을 최종 승인하시겠습니까?')) return;
    const note = action === 'reject' ? prompt('반려 사유를 입력해주세요.') ?? '' : '';
    if (action === 'reject' && !note.trim()) return;
    setWorking(request.id); setMessage('');
    try {
      const response = await fetch('/api/mvp/transfers/' + request.id, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage(action === 'destination' ? '새 소속 승인이 완료되어 협회 담당자 전원에게 전달되었습니다.' : '처리 완료된 승인입니다.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : '처리하지 못했습니다.'); }
    finally { await sync(); setWorking(''); }
  }

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;
  const officer = canReviewAssociation(user);
  const destinationChair = user.position === '회장' && !isAdmin(user);

  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 회원등록·이적 / 알림·승인</span><h1>알림 · 승인</h1><p>새 소속 승인 뒤 협회 담당자가 최종 확인합니다. 처리된 요청은 모든 담당자에게 완료 상태로 남습니다.</p></div></section>
    <section className="siteShell pageContent"><div className={styles.panel}>
      <div className={styles.head}><div><h2>이적 승인 업무</h2><p>{officer ? '협회 승인 대기와 처리 결과를 확인합니다.' : '내 소속의 이적 신청과 처리 결과를 확인합니다.'}</p></div></div>
      {message && <p role="status" className={styles.message}>{message}</p>}
      {requests.length === 0 ? <div className={styles.empty}>현재 확인할 이적 요청이 없습니다.</div> :
        <div className={styles.list}>{requests.map((request) => {
          const done = request.status === 'approved' || request.status === 'rejected';
          return <article className={styles.item} key={request.id}>
            <div className={styles.itemTop}><div><h3>{request.memberName} 회원</h3><div className={styles.meta}>신청일 {request.requestDate} · 기존 회장 {request.sourceChairName} · {request.rank || '부수 미등록'}</div></div>
              <span className={[styles.badge, done ? styles.badgeDone : ''].join(' ')}>{statusLabel[request.status]}</span></div>
            <div className={styles.route}>{request.fromClub} → {request.toClub}</div>
            {request.adminNote && <p>반려 사유: {request.adminNote}</p>}
            {done && <p role="status">처리 완료된 승인입니다.{request.processedBy ? ' 처리자: ' + (request.processedBy === 'admin' ? '관리자' : '협회 담당자') : ''}</p>}
            <div className={styles.itemActions}>
              {officer && <><button type="button" onClick={() => download(request, 'consent')} disabled={!!downloading}>이적동의서 HWP</button>
                <button type="button" onClick={() => download(request, 'application')} disabled={!!downloading}>이적·소속변경 신청서 HWP</button></>}
              {destinationChair && request.toClub === user.club && request.status === 'pending_destination' &&
                <button type="button" className={styles.approve} disabled={!!working} onClick={() => process(request, 'destination')}>새 소속 승인</button>}
              {officer && request.status === 'pending_admin' && <><button type="button" className={styles.approve} disabled={!!working} onClick={() => process(request, 'approve')}>최종 승인</button>
                <button type="button" className={styles.reject} disabled={!!working} onClick={() => process(request, 'reject')}>반려</button></>}
            </div>
          </article>;
        })}</div>}
    </div></section>
  </>;
}
