'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUsers, isAdmin, type MvpUser } from '@/lib/mvpAuth';
import { getTransferRequests } from '@/lib/mvpTransfer';
import styles from '@/app/members/transfer/transfer.module.css';

const titles = ['', '협회장', '이사', '총무', '고문'];
const clubPositions = ['일반', '회장', '부회장', '총무'];

export default function AdminMembersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<MvpUser[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [legacyCount, setLegacyCount] = useState(0);

  useEffect(() => {
    if (!isAdmin(getCurrentUser())) { router.replace('/login'); return; }
    setLegacyCount(getUsers().length);
    fetch('/api/mvp/members').then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setUsers(result.users);
    }).catch((cause) => setError(cause.message));
  }, [router]);

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
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 관리자 / 회원 직책</span><h1>회원 직책 관리</h1><p>협회 직책은 기본적으로 없으며, 부여된 회원만 협회 승인 업무를 처리할 수 있습니다.</p></div></section>
    <section className="siteShell pageContent"><div className={styles.panel}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {legacyCount > 0 && <p className={styles.notice}>이 브라우저에 저장된 기존 회원 {legacyCount}명을 가져올 수 있습니다. <button type="button" onClick={importLocal}>기존 회원 가져오기</button></p>}
      {users.length === 0 && !error && <p>등록된 회원이 없습니다.</p>}
      <div className={styles.list}>{users.map((user) => <article className={styles.item} key={user.id}>
        <h2>{user.name} <small>{user.club} · {user.phone}</small></h2>
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
      </article>)}</div>
    </div></section>
  </>;
}
