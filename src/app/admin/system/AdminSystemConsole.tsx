'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ASSOCIATION_TITLES, CLUB_POSITIONS, isPersonalClub, type MvpUser } from '@/lib/mvpAuth';
import styles from './system.module.css';

type RoleDraft = { associationTitle: string; position: string };

function originalRole(user: MvpUser): RoleDraft {
  return { associationTitle: user.associationTitle ?? '', position: user.position };
}

function nameLabel(user: MvpUser) {
  return user.name + ' (' + user.club + ')';
}

export default function AdminSystemConsole() {
  const [members, setMembers] = useState<MvpUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RoleDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [query, setQuery] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/mvp/members', { cache: 'no-store' });
        const result = await response.json() as { users?: MvpUser[]; message?: string };
        if (!response.ok) throw new Error(result.message ?? '계정 정보를 가져오지 못했습니다.');
        if (!cancelled) setMembers(result.users ?? []);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '계정 정보를 가져오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const active = useMemo(() => members.filter((member) => member.memberStatus !== 'withdrawn'), [members]);
  const namedClubs = useMemo(() =>
    [...new Set(members.map((member) => member.club).filter((club) => club && !isPersonalClub(club)))]
      .sort((a, b) => a.localeCompare(b, 'ko')), [members]);

  const filtered = useMemo(() => {
    const word = query.trim().toLocaleLowerCase();
    return members.filter((member) =>
      (!clubFilter || member.club === clubFilter) &&
      (!word || [member.name, member.phone, member.club].some((value) => value.toLocaleLowerCase().includes(word)))
    );
  }, [clubFilter, members, query]);

  function roleFor(user: MvpUser) {
    return drafts[user.id] ?? originalRole(user);
  }

  function changeRole(user: MvpUser, field: keyof RoleDraft, value: string) {
    setNotice('');
    setError('');
    setDrafts((current) => ({
      ...current,
      [user.id]: { ...(current[user.id] ?? originalRole(user)), [field]: value },
    }));
  }

  async function saveRole(user: MvpUser) {
    const role = roleFor(user);
    if (role.associationTitle === (user.associationTitle ?? '') && role.position === user.position) return;
    if (!window.confirm(nameLabel(user) + ' 계정의 직책을 변경하시겠습니까?\n\n협회 직책: ' + (role.associationTitle || '없음') + '\n동호회 직책: ' + role.position)) return;
    setSaving(user.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/mvp/members/' + user.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          associationTitle: role.associationTitle,
          position: role.position,
          memberStatus: user.memberStatus ?? 'active',
        }),
      });
      const result = await response.json() as { user?: MvpUser; message?: string };
      if (!response.ok || !result.user) throw new Error(result.message ?? '직책 변경에 실패했습니다.');
      setMembers((current) => current.map((item) => item.id === user.id ? result.user! : item));
      setDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setNotice(user.name + ' 계정의 직책을 저장했습니다.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '직책 변경에 실패했습니다.');
    } finally {
      setSaving('');
    }
  }

  return (
    <div className="siteShell pageContent">
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>GUNSAN TABLE TENNIS ASSOCIATION / SYSTEM ADMIN</p>
          <h1>관리자 대시보드</h1>
          <p>홈페이지 계정에 협회 임원·동호회 직책을 부여하고 운영 권한을 관리합니다.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">협회 업무 현황 보기 →</Link>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}
      {loading && <p role="status" className={styles.muted}>관리 대상 계정을 불러오는 중입니다.</p>}

      {!loading && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}><span>홈페이지 가입 계정</span><strong>{members.length}</strong><small>활동 {active.length}명</small></div>
            <div className={styles.stat}><span>협회 임원 계정</span><strong>{active.filter((member) => ASSOCIATION_TITLES.some((title) => title === member.associationTitle)).length}</strong><small>협회장 · 사무국장 · 총무</small></div>
            <div className={styles.stat}><span>동호회 회장 계정</span><strong>{active.filter((member) => member.position === '회장' && !isPersonalClub(member.club)).length}</strong><small>동호회별 직책 기준</small></div>
            <div className={styles.stat}><span>동호회 총무 계정</span><strong>{active.filter((member) => member.position === '총무' && !isPersonalClub(member.club)).length}</strong><small>동호회별 직책 기준</small></div>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>협회 임원 지정 현황</h2><p>협회 직책은 동호회 직책과 별개로 부여합니다.</p></div>
              <a href="#role-management" className={styles.textLink}>직책 지정하기 ↓</a>
            </div>
            <div className={styles.officerRows}>
              {ASSOCIATION_TITLES.map((title) => {
                const assigned = active.filter((member) => member.associationTitle === title);
                return (
                  <div className={styles.officerRow} key={title}>
                    <strong>{title}</strong>
                    <span>{assigned.length ? assigned.map(nameLabel).join(', ') : '미지정'}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>동호회 직책 현황</h2><p>현재 홈페이지에 가입한 계정 기준입니다. 공식 선수명부 전체 인원과는 다릅니다.</p></div>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.summaryTable}>
                <thead><tr><th>동호회</th><th>회장</th><th>총무</th><th>가입 계정</th></tr></thead>
                <tbody>
                  {namedClubs.map((club) => {
                    const clubMembers = active.filter((member) => member.club === club);
                    return (
                      <tr key={club}>
                        <td className={styles.primaryCell}>{club}</td>
                        <td>{clubMembers.filter((member) => member.position === '회장').map((member) => member.name).join(', ') || '미지정'}</td>
                        <td>{clubMembers.filter((member) => member.position === '총무').map((member) => member.name).join(', ') || '미지정'}</td>
                        <td>{clubMembers.length}명</td>
                      </tr>
                    );
                  })}
                  {!namedClubs.length && <tr><td colSpan={4} className={styles.empty}>동호회 소속 가입 계정이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section id="role-management" className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>회원 계정 · 직책 부여</h2><p>해당 회원의 직책을 선택하고 ‘저장’을 눌러야 권한이 변경됩니다.</p></div>
              <Link className={styles.textLink} href="/admin/members">전체 회원 관리 →</Link>
            </div>
            <div className={styles.filters}>
              <label>회원 검색
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 · 전화번호 · 소속" />
              </label>
              <label>소속
                <select value={clubFilter} onChange={(event) => setClubFilter(event.target.value)}>
                  <option value="">전체 소속</option>
                  {[...new Set(members.map((member) => member.club))].sort((a, b) => a.localeCompare(b, 'ko')).map((club) => <option key={club} value={club}>{club}</option>)}
                </select>
              </label>
              <span>검색 결과 {filtered.length}명</span>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.roleTable}>
                <thead><tr><th>이름</th><th>소속</th><th>상태</th><th>협회 직책</th><th>동호회 직책</th><th>적용</th></tr></thead>
                <tbody>
                  {filtered.map((member) => {
                    const draft = roleFor(member);
                    const inactive = member.memberStatus === 'withdrawn';
                    const isSaving = saving === member.id;
                    const changed = draft.associationTitle !== (member.associationTitle ?? '') || draft.position !== member.position;
                    return (
                      <tr key={member.id}>
                        <td className={styles.primaryCell}>{member.name}<small>{member.phone}</small></td>
                        <td>{member.club}</td>
                        <td>{inactive ? '비활성' : '활동'}</td>
                        <td>
                          <select aria-label={member.name + ' 협회 직책'} value={draft.associationTitle}
                            disabled={inactive || !!saving}
                            onChange={(event) => changeRole(member, 'associationTitle', event.target.value)}>
                            <option value="">없음</option>
                            {ASSOCIATION_TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
                          </select>
                        </td>
                        <td>
                          <select aria-label={member.name + ' 동호회 직책'} value={draft.position}
                            disabled={inactive || isPersonalClub(member.club) || !!saving}
                            onChange={(event) => changeRole(member, 'position', event.target.value)}>
                            {CLUB_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
                          </select>
                        </td>
                        <td><button className={styles.saveButton} type="button" disabled={!changed || inactive || !!saving}
                          onClick={() => saveRole(member)}>{isSaving ? '저장 중' : changed ? '변경 저장' : '저장됨'}</button></td>
                      </tr>
                    );
                  })}
                  {!filtered.length && <tr><td colSpan={6} className={styles.empty}>조건에 맞는 가입 계정이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className={styles.footnote}>‘개인’과 ‘개인(타지역)’ 계정에는 동호회 회장·총무 직책을 줄 수 없습니다. 동호회 회장·총무는 회원등록 업무 권한을 갖고, 이적 업무는 이후 단계에서 연결합니다.</p>
          </section>
        </>
      )}
    </div>
  );
}
