'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { applyMembershipChange, getCurrentUser, isAdmin, type MvpUser } from '@/lib/mvpAuth';
import { getTransferRequests, TRANSFER_CHANGE_EVENT, updateTransferRequest, type TransferRequest } from '@/lib/mvpTransfer';
import styles from '../transfer/transfer.module.css';

const statusLabel = { pending_admin: '관리자 승인 대기', approved: '이적 완료', rejected: '반려' } as const;

export default function ApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [downloading, setDownloading] = useState('');

  const sync = useCallback((currentUser: MvpUser) => {
    const all = getTransferRequests();
    setRequests(isAdmin(currentUser) ? all : all.filter((item) => item.sourceChairUserId === currentUser.id || item.fromClub === currentUser.club));
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) { router.replace('/login'); return; }
    if (currentUser.position !== '회장' && !isAdmin(currentUser)) {
      alert('알림 · 승인 업무는 회장 또는 관리자만 확인할 수 있습니다.');
      router.replace('/members');
      return;
    }
    setUser(currentUser);
    sync(currentUser);
    const handle = () => sync(currentUser);
    window.addEventListener(TRANSFER_CHANGE_EVENT, handle);
    window.addEventListener('storage', handle);
    return () => { window.removeEventListener(TRANSFER_CHANGE_EVENT, handle); window.removeEventListener('storage', handle); };
  }, [router, sync]);

  async function download(request: TransferRequest, kind: 'consent' | 'application') {
    const key = request.id + kind;
    setDownloading(key);
    try {
      const response = await fetch('/api/transfer/hwp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, request }) });
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = kind === 'consent' ? request.memberName + '_이적동의서.hwp' : request.memberName + '_이적_소속변경신청서.hwp';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('한글파일을 생성하지 못했습니다.');
    } finally {
      setDownloading('');
    }
  }

  function approve(request: TransferRequest) {
    if (!user || !isAdmin(user)) return;
    if (!confirm(request.memberName + ' 회원의 이적을 최종 승인하시겠습니까?')) return;
    applyMembershipChange(request.memberId, { club: request.toClub });
    updateTransferRequest(request.id, { status: 'approved', processedAt: new Date().toISOString(), adminNote: '' });
  }

  function reject(request: TransferRequest) {
    if (!user || !isAdmin(user)) return;
    const note = prompt('반려 사유를 입력해주세요.') ?? '';
    if (!note.trim()) return;
    updateTransferRequest(request.id, { status: 'rejected', processedAt: new Date().toISOString(), adminNote: note.trim() });
  }

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;
  const admin = isAdmin(user);

  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 회원등록·이적 / 알림·승인</span><h1>알림 · 승인</h1><p>{admin ? '회장 서명이 완료되어 관리자 최종 확인이 필요한 이적 요청을 처리합니다.' : user.name + ' 회장님이 등록한 이적 신청과 처리 상태를 확인합니다.'}</p></div></section>

      <section className="siteShell pageContent">
        <div className={styles.panel}>
          <div className={styles.head}><div><h2>{admin ? '관리자 이적 승인 업무' : '내 구장 이적 신청 현황'}</h2><p>{admin ? '이적동의서와 이적·소속변경 신청서를 한글파일로 내려받고 최종 승인합니다.' : '기존 소속 구장 회장 서명이 적용된 이적 요청의 진행 상태입니다.'}</p></div></div>

          {requests.length === 0 ? <div className={styles.empty}>현재 확인할 이적 요청이 없습니다.</div> : (
            <div className={styles.list}>
              {requests.map((request) => {
                const badgeClass = [styles.badge, request.status === 'approved' ? styles.badgeDone : '', request.status === 'rejected' ? styles.badgeRejected : ''].filter(Boolean).join(' ');
                return (
                  <article className={styles.item} key={request.id}>
                    <div className={styles.itemTop}><div><h3>{request.memberName} 회원</h3><div className={styles.meta}>신청일 {request.requestDate} · 기존 회장 {request.sourceChairName} · {request.rank || '부수 미등록'}</div></div><span className={badgeClass}>{statusLabel[request.status]}</span></div>
                    <div className={styles.route}>{request.fromClub} → {request.toClub}</div>
                    {request.adminNote && <div className={styles.error}>반려 사유: {request.adminNote}</div>}
                    {admin && (
                      <div className={styles.itemActions}>
                        <button type="button" onClick={() => download(request, 'consent')} disabled={downloading === request.id + 'consent'}>{downloading === request.id + 'consent' ? '생성 중...' : '이적동의서 HWP'}</button>
                        <button type="button" onClick={() => download(request, 'application')} disabled={downloading === request.id + 'application'}>{downloading === request.id + 'application' ? '생성 중...' : '이적·소속변경 신청서 HWP'}</button>
                        {request.status === 'pending_admin' && <><button type="button" className={styles.approve} onClick={() => approve(request)}>최종 승인</button><button type="button" className={styles.reject} onClick={() => reject(request)}>반려</button></>}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
