'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import styles from './transfer.module.css';

export default function TransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [users, setUsers] = useState<MvpUser[]>([]);
  const [clubs, setClubs] = useState<string[]>([]);
  const [memberId, setMemberId] = useState('');
  const [toClub, setToClub] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    refreshCurrentUser().then(async (currentUser) => {
      if (!currentUser) { router.replace('/login'); return; }
      if (!isAdmin(currentUser) && currentUser.position !== '회장') {
        alert('이적 신청은 구장 회장 또는 관리자만 이용할 수 있습니다.');
        router.replace('/members'); return;
      }
      setUser(currentUser);
      const response = await fetch('/api/mvp/members');
      const result = await response.json();
      if (!response.ok) { setError(result.message); return; }
      setUsers((result.users as MvpUser[]).filter((item) => item.memberStatus !== 'withdrawn'));
      const clubResponse = await fetch('/api/mvp/clubs');
      if (clubResponse.ok) setClubs((await clubResponse.json()).clubs);
    }).catch(() => setError('회원 목록을 불러오지 못했습니다.'));
  }, [router]);

  const eligibleMembers = useMemo(() => {
    if (!user) return [];
    if (isAdmin(user)) return users;
    return users.filter((item) => item.club === user.club);
  }, [user, users]);

  const member = eligibleMembers.find((item) => item.id === memberId) ?? null;

  function sourceChairFor(target: MvpUser) {
    if (!user) return null;
    if (!isAdmin(user)) return user.position === '회장' && user.club === target.club ? user : null;
    return users.find((item) => item.club === target.club && item.position === '회장') ?? null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!user || !member) { setError('이적할 회원을 선택해주세요.'); return; }
    const destination = toClub.trim();
    if (!destination) { setError('이적할 소속을 입력해주세요.'); return; }
    if (destination === member.club) { setError('기존 소속과 다른 이적 소속을 입력해주세요.'); return; }

    const chair = sourceChairFor(member);
    if (!chair) { setError('기존 소속 구장의 회장 계정을 찾을 수 없습니다.'); return; }
    if (!chair.signatureDataUrl) { setError('기존 소속 구장 회장의 서명이 등록되어 있지 않습니다. 회장 계정의 정보수정에서 서명을 먼저 등록해주세요.'); return; }

    const response = await fetch('/api/mvp/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, toClub: destination }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? '이적 신청을 저장하지 못했습니다.'); return; }

    setMemberId('');
    setToClub('');
    setMessage('이적 신청이 등록되었습니다. 새 소속 회장 승인 후 협회 승인 업무로 전달됩니다.');
  }

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;
  const chair = member ? sourceChairFor(member) : null;

  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 회원등록·이적 / 이적신청</span><h1>회원 이적신청</h1><p>{isAdmin(user) ? '관리자 권한으로 이적 신청을 등록합니다.' : user.club + ' 회장 권한으로 소속 회원의 이적 신청을 등록합니다.'}</p></div></section>

      <section className="siteShell pageContent">
        <form className={styles.panel} onSubmit={submit}>
          <div className={styles.head}><div><h2>이적 신청서 작성</h2><p>회원정보는 가입정보에서 불러오고, 기존 소속 구장 회장의 저장된 서명을 사용합니다.</p></div></div>
          <p className={styles.notice}>기존 소속 회장의 서명으로 신청합니다. 새 소속 회장은 서명 없이 승인하고, 그때 협회 담당자 전원에게 승인 업무가 표시됩니다.</p>

          <div className={styles.grid}>
            <div className={styles.field + ' ' + styles.fieldWide}>
              <label htmlFor="member">이적 회원</label>
              <select id="member" value={memberId} onChange={(e) => { setMemberId(e.target.value); setToClub(''); }}>
                <option value="">회원을 선택하세요</option>
                {eligibleMembers.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.club} / {item.rank || '부수 미등록'}</option>)}
              </select>
            </div>
            <div className={styles.field}><label>성명</label><input value={member?.name ?? ''} readOnly /></div>
            <div className={styles.field}><label>성별</label><input value={member?.gender ?? ''} readOnly /></div>
            <div className={styles.field}><label>부수</label><input value={member?.rank ?? ''} readOnly /></div>
            <div className={styles.field}><label>연락처</label><input value={member?.phone ?? ''} readOnly /></div>
            <div className={styles.field}><label>기존 소속</label><input value={member?.club ?? ''} readOnly /></div>
            <div className={styles.field}><label htmlFor="toClub">이적 소속</label><input id="toClub" list="club-options" value={toClub} onChange={(e) => setToClub(e.target.value)} placeholder="이적할 구장/클럽" /><datalist id="club-options">{clubs.filter((club) => club !== member?.club).map((club) => <option key={club} value={club} />)}</datalist></div>

            {member && (
              <div className={styles.signaturePreview}>
                {chair?.signatureDataUrl ? <img src={chair.signatureDataUrl} alt="기존 소속 구장 회장 서명" /> : <div>서명 미등록</div>}
                <div><strong>기존 소속 회장: {chair?.name ?? '회장 계정 없음'}</strong><span>{chair?.signatureDataUrl ? '저장된 회장 서명이 이적동의서에 사용됩니다.' : '서명을 등록해야 이적 신청을 완료할 수 있습니다.'}</span></div>
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.message}>{message}</p>}
          <div className={styles.actions}><Link href="/members" className={styles.secondary}>목록으로</Link><button type="submit" className={styles.primary}>이적 신청 등록</button></div>
        </form>
      </section>
    </>
  );
}
