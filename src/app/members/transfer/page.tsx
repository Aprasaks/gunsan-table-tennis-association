'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isPersonalClub, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import type { TransferRequest } from '@/lib/mvpTransfer';
import styles from './transfer.module.css';

type DraftMember = {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  rank: string;
  phone: string;
  registrationType: string;
};
type Alert = { id: string; title: string; detail: string; targetUrl: string; read: boolean };

const statusLabels: Record<string, string> = {
  pending_source_chair: '기존 회장 동의 대기',
  pending_admin: '협회 승인 대기',
  approved: '이적 완료',
  rejected: '반려',
};

export default function TransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [draftMembers, setDraftMembers] = useState<DraftMember[]>([]);
  const [fromClubs, setFromClubs] = useState<string[]>([]);
  const [draftMemberId, setDraftMemberId] = useState('');
  const [fromClub, setFromClub] = useState('');
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reading, setReading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshInbox = useCallback(async () => {
    const [requestsResponse, alertsResponse] = await Promise.all([
      fetch('/api/mvp/transfers', { cache: 'no-store' }),
      fetch('/api/mvp/alerts', { cache: 'no-store' }),
    ]);
    const [requestData, alertData] = await Promise.all([requestsResponse.json(), alertsResponse.json()]);
    if (!requestsResponse.ok) throw new Error(requestData.message ?? '이적 요청을 불러오지 못했습니다.');
    if (!alertsResponse.ok) throw new Error(alertData.message ?? '알림을 불러오지 못했습니다.');
    setRequests(requestData.requests ?? []);
    setAlerts((alertData.alerts ?? []).filter((alert: Alert) => alert.targetUrl === '/members/transfer'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const current = await refreshCurrentUser();
        if (cancelled) return;
        if (!current) { router.replace('/login'); return; }
        if (current.role === 'admin' || current.position !== '회장' || isPersonalClub(current.club)) {
          router.replace('/members');
          return;
        }
        setUser(current);
        const [rosterResponse, clubsResponse] = await Promise.all([
          fetch('/api/mvp/roster', { cache: 'no-store' }),
          fetch('/api/mvp/clubs', { cache: 'no-store' }),
        ]);
        const [roster, clubs] = await Promise.all([rosterResponse.json(), clubsResponse.json()]);
        if (!rosterResponse.ok) throw new Error(roster.message ?? '회원등록 명단을 불러오지 못했습니다.');
        if (!clubsResponse.ok) throw new Error(clubs.message ?? '동호회 목록을 불러오지 못했습니다.');
        if (cancelled) return;
        const members: DraftMember[] = Array.isArray(roster.draft?.members) ? roster.draft.members : [];
        setDraftMembers(members.filter((member) => member.registrationType === '이적' && member.name?.trim()));
        setFromClubs((clubs.clubs ?? []).filter((club: string) => club !== current.club && !isPersonalClub(club)));
        await refreshInbox();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '이적 업무를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshInbox().catch(() => undefined);
    }, 15000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [refreshInbox, router]);

  const selected = draftMembers.find((member) => member.id === draftMemberId);
  const outgoing = useMemo(() => requests.filter((request) => request.requestedBy === user?.id), [requests, user?.id]);
  const incoming = useMemo(() => requests.filter((request) => request.sourceChairUserId === user?.id), [requests, user?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!selected || !fromClub) {
      setError('등록구분이 이적인 선수와 기존 소속 동호회를 선택해주세요.');
      return;
    }
    if (!window.confirm(selected.name + ' 회원의 이적을 ' + fromClub + ' 회장에게 요청하시겠습니까?\n\n회장이 수락하기 전에는 서명이나 소속 변경이 일어나지 않습니다.')) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/mvp/transfers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftMemberId: selected.id, fromClub }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? '이적 요청에 실패했습니다.');
      setDraftMemberId('');
      setFromClub('');
      setMessage('이적 요청을 접수했습니다. 기존 소속 동호회 회장에게 동의 요청 알림이 전달되었습니다.');
      await refreshInbox();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '이적 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function markRead(id: string) {
    setReading(id);
    try {
      const response = await fetch('/api/mvp/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? '알림을 읽음 처리하지 못했습니다.');
      setAlerts((list) => list.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '알림을 읽음 처리하지 못했습니다.');
    } finally {
      setReading('');
    }
  }

  if (!user || loading) return <div className="siteShell pageContent">이적 업무를 확인하고 있습니다.</div>;

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME / 회원등록·이적 / 이적신청</span>
          <h1>회원 이적신청</h1>
          <p>{user.club} 회장 업무 · 새 소속 이적 신청 및 기존 소속 동의 요청 확인</p>
        </div>
      </section>
      <section className="siteShell pageContent">
        <form className={styles.panel} onSubmit={submit}>
          <div className={styles.head}>
            <div><h2>이적 신청</h2><p>새 소속 동호회 회장이 이적할 선수를 먼저 등록한 뒤 신청합니다.</p></div>
            <Link href="/members/register" className={styles.secondary}>회원등록 명단 작성 →</Link>
          </div>
          <p className={styles.notice}>1. 새 소속 회원등록 명단에 선수를 <strong>이적</strong>으로 기재하고 저장하세요. 2. 아래에서 선수를 선택하고 기존 동호회를 지정하세요. 3. 기존 회장이 동의한 뒤 협회 승인 단계로 넘어갑니다.</p>
          <div className={styles.grid}>
            <div className={styles.field + ' ' + styles.fieldWide}>
              <label htmlFor="draft-member">새 소속에 등록한 이적 선수</label>
              <select id="draft-member" value={draftMemberId} onChange={(event) => setDraftMemberId(event.target.value)}>
                <option value="">이적 선수 선택</option>
                {draftMembers.map((member) =>
                  <option key={member.id} value={member.id}>{member.name} · {member.birthDate} · {member.rank || '부수 미입력'}</option>)}
              </select>
              {!draftMembers.length && <p className={styles.helper}>저장된 이적 선수 명단이 없습니다. 회원등록 화면에서 등록구분을 ‘이적’으로 변경하고 저장한 뒤 이 화면을 다시 열어주세요.</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="source-club">기존 소속 동호회 (A)</label>
              <select id="source-club" value={fromClub} onChange={(event) => setFromClub(event.target.value)}>
                <option value="">기존 소속 선택</option>
                {fromClubs.map((club) => <option key={club} value={club}>{club}</option>)}
              </select>
              {!fromClubs.length && <p className={styles.helper}>현재 회장 계정이 지정된 다른 동호회가 없습니다. 관리자 대시보드에서 먼저 회장 직책을 지정해주세요.</p>}
            </div>
            <div className={styles.field}><label>새 소속 동호회 (B)</label><input value={user.club} readOnly /></div>
            <div className={styles.field}><label>성명</label><input value={selected?.name ?? ''} readOnly /></div>
            <div className={styles.field}><label>성별·부수</label><input value={selected ? selected.gender + ' · ' + selected.rank : ''} readOnly /></div>
            <div className={styles.field}><label>생년월일</label><input value={selected?.birthDate ?? ''} readOnly /></div>
            <div className={styles.field}><label>연락처</label><input value={selected?.phone ?? ''} readOnly /></div>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p className={styles.message} role="status">{message}</p>}
          <div className={styles.actions}>
            <Link href="/members" className={styles.secondary}>업무 목록</Link>
            <button type="submit" className={styles.primary} disabled={submitting || !draftMembers.length || !fromClubs.length}>
              {submitting ? '접수 중…' : '기존 회장에게 이적 동의 요청'}
            </button>
          </div>
        </form>

        <section className={styles.panel + ' ' + styles.sectionGap}>
          <div className={styles.head}><div><h2>받은 이적 동의 요청</h2><p>내 동호회에서 다른 동호회로 이적하려는 회원에 대한 요청입니다.</p></div></div>
          {alerts.some((item) => !item.read) && <div className={styles.list}>
            {alerts.filter((item) => !item.read).map((alert) => (
              <div className={styles.item} key={alert.id}>
                <div className={styles.itemTop}><strong>{alert.title}</strong><span className={styles.badge}>읽지 않음</span></div>
                <p className={styles.meta}>{alert.detail}</p>
                <div className={styles.itemActions}>
                  <button type="button" onClick={() => markRead(alert.id)} disabled={reading === alert.id}>{reading === alert.id ? '처리 중…' : '알림 읽음 표시'}</button>
                </div>
              </div>
            ))}
          </div>}
          {incoming.length === 0 ? <p className={styles.empty}>현재 받은 이적 동의 요청이 없습니다.</p> :
            <div className={styles.list}>
              {incoming.map((request) => (
                <article key={request.id} className={styles.item}>
                  <div className={styles.itemTop}><h3>{request.memberName}</h3><span className={styles.badge}>{statusLabels[request.status] ?? request.status}</span></div>
                  <p className={styles.meta}>신청일 {request.requestDate} · {request.rank}</p>
                  <div className={styles.route}>{request.fromClub} → {request.toClub}</div>
                  {request.status === 'pending_source_chair' && <p className={styles.helper}>이적 요청이 접수되었습니다. 수락·반려와 서명 적용은 다음 단계에서 연결됩니다. 현재는 동의하거나 서명하지 않은 상태입니다.</p>}
                </article>
              ))}
            </div>}
        </section>

        <section className={styles.panel + ' ' + styles.sectionGap}>
          <div className={styles.head}><div><h2>내가 신청한 이적</h2><p>이적 신청 후 기존 소속 회장의 동의 여부를 확인합니다.</p></div></div>
          {!outgoing.length ? <p className={styles.empty}>신청한 이적 요청이 없습니다.</p> :
            <div className={styles.list}>
              {outgoing.map((request) => (
                <article key={request.id} className={styles.item}>
                  <div className={styles.itemTop}><h3>{request.memberName}</h3><span className={styles.badge}>{statusLabels[request.status] ?? request.status}</span></div>
                  <div className={styles.route}>{request.fromClub} → {request.toClub}</div>
                  <p className={styles.meta}>신청일 {request.requestDate} · 기존 회장 {request.sourceChairName}</p>
                </article>
              ))}
            </div>}
        </section>
      </section>
    </>
  );
}
