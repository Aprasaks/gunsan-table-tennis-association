'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers, isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import { getTransferRequests } from '@/lib/mvpTransfer';
import styles from '@/app/members/transfer/transfer.module.css';
import roster from './roster.module.css';

const titles = ['', '협회장', '이사', '총무', '고문'];
const clubPositions = ['일반', '회장', '부회장', '총무'];

export default function AdminMembersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<MvpUser[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [legacyCount, setLegacyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [club, setClub] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!isAdmin(await refreshCurrentUser())) { router.replace('/login'); return; }
        setLegacyCount(getUsers().filter((user) => user.id !== 'admin-root').length);
        const response = await fetch('/api/mvp/members', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (!cancelled) setUsers(result.users);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '회원 목록을 불러오지 못했습니다.');
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  const clubs = [...new Set(users.map((user) => user.club).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleUsers = users.filter((user) => (!club || user.club === club) &&
    (!normalizedQuery || [user.name, user.phone, user.club].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))));

  async function importLocal() {
    if (!confirm('이 브라우저에 저장된 기존 회원을 협회 공통 회원 목록으로 가져오시겠습니까?')) return;
    setError('');
    const response = await fetch('/api/mvp/import', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: getUsers(), requests: getTransferRequests() }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message); return; }
    const list = await fetch('/api/mvp/members').then((value) => value.json());
    setUsers(list.users ?? []);
    setLegacyCount(0);
    alert(result.imported + '명과 이적 신청 ' + result.importedRequests + '건을 가져왔습니다. 이미 등록된 항목은 중복 추가하지 않았습니다.');
  }

  async function save(user: MvpUser, associationTitle: string, position: string) {
    setSaving(user.id); setError('');
    try {
      const response = await fetch('/api/mvp/members/' + user.id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associationTitle, position }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setUsers((current) => current.map((item) => item.id === user.id ? result.user : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '직책을 저장하지 못했습니다.');
    } finally { setSaving(''); }
  }

  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 관리자 / 회원 명부</span><h1>회원 명부와 직책</h1><p>전체 가입 회원을 확인하고 협회 직책을 부여하거나 해제합니다.</p></div></section>
    <section className="siteShell pageContent"><div className={styles.panel}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {legacyCount > 0 && <p className={styles.notice}>이 브라우저에 저장된 기존 회원 {legacyCount}명을 가져올 수 있습니다. <button type="button" onClick={importLocal}>기존 회원 가져오기</button></p>}
      {loading ? <p role="status">회원 명부를 불러오는 중입니다.</p> : !error && <>
      <div className={roster.toolbar}>
        <div><strong>전체 {users.length}명</strong><span>활동 {users.filter((user) => user.memberStatus !== 'withdrawn').length}명 · 검색 결과 {visibleUsers.length}명</span></div>
        <label>회원 검색<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 연락처, 소속" /></label>
        <label>소속<select value={club} onChange={(event) => setClub(event.target.value)}><option value="">전체 소속</option>{clubs.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>
      {users.length === 0 && <p className={styles.empty}>등록된 회원이 없습니다.</p>}
      {users.length > 0 && visibleUsers.length === 0 && <p className={styles.empty}>검색 조건에 맞는 회원이 없습니다.</p>}
      <div className={styles.list}>{visibleUsers.map((user) => <article className={styles.item} key={user.id}>
        <h2 className={roster.name}>{user.name} <span className={roster.status}>{user.memberStatus === 'withdrawn' ? '탈퇴' : '활동'}</span></h2>
        <p className={roster.details}>소속 {user.club || '없음'} · 연락처 {user.phone || '없음'} · 부수 {user.rank || '없음'} · 가입일 {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '기록 없음'}</p>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor={'association-' + user.id}>협회 직책</label>
            <select id={'association-' + user.id} value={user.associationTitle ?? ''} disabled={saving === user.id}
              onChange={(event) => save(user, event.target.value, user.position)}>
              {titles.map((title) => <option key={title} value={title}>{title || '없음'}</option>)}
            </select></div>
          <div className={styles.field}><label htmlFor={'club-' + user.id}>구장 직책</label>
            <select id={'club-' + user.id} value={user.position} disabled={saving === user.id}
              onChange={(event) => save(user, user.associationTitle ?? '', event.target.value)}>
              {clubPositions.map((title) => <option key={title}>{title}</option>)}
            </select></div>
        </div>
      </article>)}</div></>}
    </div></section>
  </>;
}
