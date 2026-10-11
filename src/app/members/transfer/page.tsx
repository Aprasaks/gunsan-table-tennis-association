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

const statusLabels: Record<string, string> = {
  pending_source_chair: 'A회장 서명 대기',
  pending_destination: 'B회장 접수 확인 대기',
  pending_admin: '협회 승인 대기',
  approved: '이적 완료',
  rejected: '반려',
};

export default function TransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [draftMembers, setDraftMembers] = useState<DraftMember[]>([]);
  const [toClubs, setToClubs] = useState<string[]>([]);
  const [draftMemberId, setDraftMemberId] = useState('');
  const [toClub, setToClub] = useState('');
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshRequests = useCallback(async () => {
    const response = await fetch('/api/mvp/transfers', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? '이적 신청 내역을 불러오지 못했습니다.');
    setRequests(result.requests ?? []);
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
        setDraftMembers(members.filter((member) => member.name?.trim()));
        setToClubs((clubs.clubs ?? []).filter((club: string) => club !== current.club && !isPersonalClub(club)));
        await refreshRequests();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '이적 업무를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshRequests().catch(() => undefined);
    }, 15000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [refreshRequests, router]);

  const selected = draftMembers.find((member) => member.id === draftMemberId);
  const outgoing = useMemo(() => requests.filter((request) => request.requestedBy === user?.id), [requests, user?.id]);
  const incoming = useMemo(() => requests.filter((request) =>
    request.toClub === user?.club && request.requestedBy !== user?.id), [requests, user?.club, user?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!selected || !toClub) {
      setError('현재 소속 명부에서 선수와 이적할 동호회를 선택해주세요.');
      return;
    }
    if (!window.confirm(
      selected.name + ' 선수를 ' + user?.club + '에서 ' + toClub +
      '으로 이적 신청하시겠습니까?\n\n현재 단계에서는 서명과 명부 이동이 발생하지 않습니다.'
    )) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/mvp/transfers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftMemberId: selected.id, toClub }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? '이적 요청에 실패했습니다.');
      setDraftMemberId('');
      setToClub('');
      setMessage('이적 신청을 접수했습니다. 기존 소속 회장의 서명 확인과 협회 승인은 다음 단계에서 진행됩니다. 현재 선수는 기존 명부에 남아 있습니다.');
      await refreshRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '이적 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function advance(request: TransferRequest, action: 'source_sign' | 'destination_confirm' | 'destination_reject') {
    const label = action === 'source_sign' ? '이적동의서에 등록된 내 서명을 적용하시겠습니까?' :
      action === 'destination_confirm' ? '이적 신청을 접수 완료하고 협회 임원에게 최종 승인을 요청하시겠습니까?' :
      '이적 신청을 반려하시겠습니까?';
    if (!window.confirm(request.memberName + ' 선수\n' + request.fromClub + ' → ' + request.toClub + '\n\n' + label)) return;
    setWorking(request.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/mvp/transfers/' + request.id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? '요청을 처리하지 못했습니다.');
      setMessage(action === 'source_sign' ? 'A회장 서명이 적용되었습니다. B동호회 회장의 접수 확인을 기다립니다.' :
        action === 'destination_confirm' ? '이적 접수를 완료했습니다. 협회 임원에게 승인 알림이 전달되었습니다.' :
        '이적 신청이 반려되었습니다.');
      await refreshRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리하지 못했습니다.');
    } finally {
      setWorking('');
    }
  }

  if (!user || loading) return <div className="siteShell pageContent">이적 업무를 확인하고 있습니다.</div>;

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME / 회원등록·이적 / 이적신청</span>
          <h1>회원 이적신청</h1>
          <p>{user.club} 회장 업무 · 우리 동호회 선수의 이적 신청</p>
        </div>
      </section>
      <section className="siteShell pageContent">
        <form className={styles.panel} onSubmit={submit}>
          <div className={styles.head}>
            <div><h2>이적 신청</h2><p>현재 소속 동호회 회장이 자기 명부의 선수를 다른 동호회로 이적 신청합니다.</p></div>
            <Link href="/members/register" className={styles.secondary}>회원등록 명부 보기 →</Link>
          </div>
          <p className={styles.notice}>1. 현재 소속 명부에서 선수를 선택합니다. 2. 이적할 동호회를 지정합니다. 3. 신청 후 서명 확인과 협회 최종 승인을 거쳐야 이적이 완료됩니다. <strong>승인 전에는 선수명부가 변경되지 않습니다.</strong></p>
          <div className={styles.grid}>
            <div className={styles.field + ' ' + styles.fieldWide}>
              <label htmlFor="draft-member">현재 우리 동호회 선수</label>
              <select id="draft-member" value={draftMemberId} onChange={(event) => setDraftMemberId(event.target.value)}>
                <option value="">이적할 선수 선택</option>
                {draftMembers.map((member) =>
                  <option key={member.id} value={member.id}>{member.name} · {member.birthDate} · {member.rank || '부수 미입력'}</option>)}
              </select>
              {!draftMembers.length && <p className={styles.helper}>저장된 선수 명단이 없습니다. 회원등록 명부에 선수를 저장한 뒤 이 화면을 다시 열어주세요.</p>}
            </div>
            <div className={styles.field}>
              <label>현재 소속 동호회 (A)</label>
              <input value={user.club} readOnly />
            </div>
            <div className={styles.field}>
              <label htmlFor="destination-club">이적할 동호회 (B)</label>
              <select id="destination-club" value={toClub} onChange={(event) => setToClub(event.target.value)}>
                <option value="">새 소속 선택</option>
                {toClubs.map((club) => <option key={club} value={club}>{club}</option>)}
              </select>
              {!toClubs.length && <p className={styles.helper}>다른 동호회의 회장 계정이 아직 지정되지 않았습니다. 관리자에게 직책 지정을 요청해주세요.</p>}
            </div>
            <div className={styles.field}><label>성명</label><input value={selected?.name ?? ''} readOnly /></div>
            <div className={styles.field}><label>성별·부수</label><input value={selected ? selected.gender + ' · ' + selected.rank : ''} readOnly /></div>
            <div className={styles.field}><label>생년월일</label><input value={selected?.birthDate ?? ''} readOnly /></div>
            <div className={styles.field}><label>연락처</label><input value={selected?.phone ?? ''} readOnly /></div>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p className={styles.message} role="status">{message}</p>}
          <div className={styles.actions}>
            <Link href="/members" className={styles.secondary}>업무 목록</Link>
            <button type="submit" className={styles.primary} disabled={submitting || !selected || !toClub || !toClubs.length}>
              {submitting ? '접수 중…' : '선택 선수 이적 신청'}
            </button>
          </div>
        </form>
        <section className={styles.panel + ' ' + styles.sectionGap}>
          <div className={styles.head}><div><h2>우리 동호회 이적 신청 내역</h2><p>협회 승인 전까지 선수는 원래 명부에 유지됩니다.</p></div></div>
          {!outgoing.length ? <p className={styles.empty}>신청한 이적 요청이 없습니다.</p> :
            <div className={styles.list}>
              {outgoing.map((request) => (
                <article key={request.id} className={styles.item}>
                  <div className={styles.itemTop}><h3>{request.memberName}</h3><span className={styles.badge}>{statusLabels[request.status] ?? request.status}</span></div>
                  <div className={styles.route}>{request.fromClub} → {request.toClub}</div>
                  <p className={styles.meta}>신청일 {request.requestDate}</p>
                  {request.adminNote && <p className={styles.meta}>반려 사유: {request.adminNote}</p>}
                  {request.status === 'pending_source_chair' &&
                    <div className={styles.itemActions}>
                      {user.signatureDataUrl ?
                        <button className={styles.approve} type="button" disabled={!!working}
                          onClick={() => advance(request, 'source_sign')}>
                          {working === request.id ? '처리 중…' : 'A회장 서명 동의'}
                        </button> :
                        <Link className={styles.secondary} href="/profile">회장 서명 먼저 등록하기 →</Link>}
                    </div>}
                  {request.status === 'pending_destination' && <p className={styles.helper}>서명 완료 · B동호회 확인을 기다리는 중입니다.</p>}
                </article>
              ))}
            </div>}
        </section>
        <section className={styles.panel + ' ' + styles.sectionGap}>
          <div className={styles.head}>
            <div><h2>받은 이적 신청</h2><p>다른 동호회에서 우리 동호회로 이적을 요청한 선수입니다.</p></div>
          </div>
          {!incoming.length ? <p className={styles.empty}>받은 이적 신청이 없습니다.</p> :
            <div className={styles.list}>
              {incoming.map((request) => (
                <article key={request.id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <h3>{request.memberName}</h3>
                    <span className={styles.badge}>{statusLabels[request.status] ?? request.status}</span>
                  </div>
                  <div className={styles.route}>{request.fromClub} → {request.toClub}</div>
                  <p className={styles.meta}>생년월일 {request.birthDate || '-'} · {request.gender} · {request.rank} · 신청일 {request.requestDate}</p>
                  {request.status === 'pending_source_chair' && <p className={styles.helper}>A동호회 회장이 서명 동의를 완료하면 접수 확인을 진행할 수 있습니다.</p>}
                  {request.status === 'pending_destination' &&
                    <div className={styles.itemActions}>
                      <button type="button" className={styles.approve} disabled={!!working}
                        onClick={() => advance(request, 'destination_confirm')}>
                        {working === request.id ? '처리 중…' : '이적신청 완료 · 협회 승인 요청'}
                      </button>
                      <button type="button" className={styles.reject} disabled={!!working}
                        onClick={() => advance(request, 'destination_reject')}>접수 반려</button>
                    </div>}
                  {request.status === 'pending_admin' && <p className={styles.helper}>B동호회 접수 완료 · 협회 임원의 최종 승인을 기다리는 중입니다.</p>}
                  {request.status === 'approved' && <p className={styles.helper}>협회 승인 완료 · 현재 우리 동호회 선수등록 명부에 ‘이적’으로 반영되었습니다.</p>}
                  {request.adminNote && <p className={styles.meta}>반려 사유: {request.adminNote}</p>}
                </article>
              ))}
            </div>}
        </section>
      </section>
    </>
  );
}
