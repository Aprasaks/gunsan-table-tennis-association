'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './registration.module.css';
import { clearSession, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';

type RegistrationMember = {
  id: string;
  name: string;
  birthDate: string;
  gender: string;
  rank: string;
  address: string;
  position: string;
  phone: string;
  registrationType: string;
  nationality: string;
};

type OfficerInfo = {
  name: string;
  phone: string;
};

type Officers = {
  manager: OfficerInfo;
  president: OfficerInfo;
  secretary: OfficerInfo;
};

type Draft = {
  clubName: string;
  clubAddress: string;
  officers?: Officers;
  members: RegistrationMember[];
  savedAt?: string;
};

type RankOption = {
  value: string;
  label: string;
};

const positions = ['관장', '회장', '부회장', '총무', '재무', '이사', '회원', '기타'];
const registrationTypes = ['기존', '신규', '이적'];
const registrationManagers = new Set(['회장', '부회장', '총무']);

function blankMember(id: string): RegistrationMember {
  return {
    id,
    name: '',
    birthDate: '',
    gender: '',
    rank: '',
    address: '',
    position: '회원',
    phone: '',
    registrationType: '기존',
    nationality: '',
  };
}

function blankOfficers(user?: MvpUser | null): Officers {
  const officers: Officers = {
    manager: { name: '', phone: '' },
    president: { name: '', phone: '' },
    secretary: { name: '', phone: '' },
  };

  if (user?.position === '회장') officers.president = { name: user.name, phone: user.phone };
  if (user?.position === '총무') officers.secretary = { name: user.name, phone: user.phone };
  return officers;
}

function rankOptions(gender: string): RankOption[] {
  if (gender === '남') {
    return [
      { value: '남 Ace', label: '선수부 (Ace)' },
      { value: '남 1부', label: '1부' },
      { value: '남 2부', label: '2부' },
      { value: '남 3부', label: '3부' },
      { value: '남 4부', label: '4부' },
      { value: '남 5부', label: '5부' },
      { value: '남 6부', label: '6부' },
      { value: '남 7부', label: '7부' },
      { value: '남 희망부', label: '희망부' },
    ];
  }

  if (gender === '여') {
    return [
      { value: '여 Ace', label: '선수부 (Ace)' },
      { value: '여 1부', label: '1부' },
      { value: '여 2부', label: '2부' },
      { value: '여 3부', label: '3부' },
      { value: '여 4부', label: '4부' },
      { value: '여 5부', label: '5부' },
      { value: '여 6부', label: '6부' },
      { value: '여 희망부', label: '희망부' },
    ];
  }

  return [];
}

function savedTimeText(value: string) {
  if (!value) return '아직 저장되지 않음';
  return `저장됨 ${new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export default function MemberRegistrationPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [clubName, setClubName] = useState('');
  const [clubAddress, setClubAddress] = useState('');
  const [officers, setOfficers] = useState<Officers>(blankOfficers());
  const [members, setMembers] = useState<RegistrationMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const currentUser = await refreshCurrentUser();
      if (!currentUser) { router.replace('/login'); return; }
      if (!registrationManagers.has(currentUser.position)) { router.replace('/members'); return; }
      try {
        const response = await fetch('/api/mvp/roster', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (cancelled) return;
        setUser(currentUser);
        let draft = result.draft as Draft | null;
        if (!draft) {
          const legacy = localStorage.getItem(`gunsan-tt-registration-draft-${currentUser.id}`);
          if (legacy) { try { draft = JSON.parse(legacy) as Draft; } catch { /* ignore old draft */ } }
        }
        setClubName(currentUser.club);
        setClubAddress(draft?.clubAddress ?? '');
        setOfficers(draft?.officers ?? blankOfficers(currentUser));
        setMembers(draft?.members?.length ? draft.members : [blankMember('member-1')]);
        setLastSavedAt(result.savedAt ?? '');
        setLoaded(true);
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : '회원등록 내역을 불러오지 못했습니다.'); }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function persist(action: 'save' | 'submit') {
    if (!user) return;
    const response = await fetch('/api/mvp/roster', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, draft: { clubName: user.club, clubAddress, officers, members } }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    setLastSavedAt(result.savedAt);
    localStorage.removeItem(`gunsan-tt-registration-draft-${user.id}`);
    return result;
  }

  useEffect(() => {
    if (!loaded || !user) return;
    const timer = window.setTimeout(() => {
      persist('save').catch((cause) => setError(cause instanceof Error ? cause.message : '자동 저장에 실패했습니다.'));
    }, 900);
    return () => window.clearTimeout(timer);
  // The form fields are the save dependencies; persist is scoped to the current render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubAddress, loaded, members, officers, user]);

  function updateOfficer(role: keyof Officers, field: keyof OfficerInfo, value: string) {
    setOfficers((current) => ({
      ...current,
      [role]: { ...current[role], [field]: value },
    }));
  }

  function updateMember(id: string, field: keyof RegistrationMember, value: string) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, [field]: value } : member));
  }

  function updateGender(id: string, gender: string) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, gender, rank: '' } : member));
  }

  function addMember() {
    setError('');
    setMembers((current) => [...current, blankMember(crypto.randomUUID())]);
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  function validate() {
    if (!clubName.trim() || !clubAddress.trim()) return '동호회명과 동호회 주소를 입력해주세요.';
    const activeMembers = members.filter((member) => member.name.trim());
    if (activeMembers.length === 0) return '등록할 회원을 한 명 이상 입력해주세요.';

    const incomplete = activeMembers.find((member) => !member.birthDate.trim() || !member.gender || !member.rank.trim() || !member.address.trim() || !member.position || !member.phone.trim());
    if (incomplete) return '회원 명단의 성명, 생년월일, 성별, 부수, 주소, 직위, 연락처를 모두 입력해주세요.';
    return '';
  }

  async function saveDraft() {
    setError('');
    try { await persist('save'); setMessage('입력내용을 협회 서버에 저장했습니다.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.'); }
  }

  async function submitRoster() {
    const issue = validate();
    if (issue) { setError(issue); return; }
    setError('');
    try {
      const result = await persist('submit');
      setMessage(result.alreadySubmitted ? '이미 제출된 명단입니다.' : '협회에 회원등록 명단을 제출했습니다. 희망부 등록은 임원진 알림함에 표시됩니다.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '제출하지 못했습니다.'); }
  }

  async function downloadExcel() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    setDownloading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/member-registration/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubName,
          clubAddress,
          officers,
          members: members.filter((member) => member.name.trim()).map(({ id, ...member }) => member),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let apiMessage = '엑셀 생성에 실패했습니다.';
        try {
          const result = JSON.parse(text) as { message?: string };
          apiMessage = result.message || apiMessage;
        } catch {
          if (text.trim()) apiMessage = text;
        }
        throw new Error(apiMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${clubName.trim()}_2026_회원등록신청서.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage('회원정보를 채운 제출용 엑셀 파일을 생성했습니다.');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : '엑셀 생성에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  }

  function logout() {
    clearSession();
    router.push('/login');
  }

  if (!loaded || !user) {
    return <div className="siteShell pageContent">{error || '회원정보를 확인하고 있습니다.'}</div>;
  }

  const activeMemberCount = members.filter((member) => member.name.trim()).length;

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 회원등록/이적 &gt; 회원등록</span>
          <h1>회원등록</h1>
          <p>희망부는 상시 등록할 수 있습니다. 명단을 협회에 제출하면 임원진에게 알림이 표시됩니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <div className={styles.panel}>
          <div className={styles.topbar}>
            <div>
              <h2>{user.name}님 회원등록</h2>
              <p>관장·회장·총무 정보는 엑셀 상단에, 아래 회원 명단은 등록 대상 목록에 들어갑니다.</p>
            </div>
            <button className={styles.logout} type="button" onClick={logout}>로그아웃</button>
          </div>

          <p className={styles.notice}>회원등록 업무는 회장·부회장·총무만 이용할 수 있습니다. 관장·회장·총무가 실제 등록 대상이면 아래 회원 명단에도 별도로 추가해주세요.</p>

          <div className={styles.clubGrid}>
            <div className={styles.field}>
              <label htmlFor="club-name">동호회(직장명)</label>
              <input id="club-name" value={clubName} readOnly />
            </div>
            <div className={styles.field}>
              <label htmlFor="club-address">동호회 주소</label>
              <input id="club-address" value={clubAddress} onChange={(e) => setClubAddress(e.target.value)} placeholder="예: 군산시 나운동" />
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <h3>담당자 정보</h3>
            <span>엑셀 상단 관장 · 회장 · 총무란에 입력됩니다.</span>
          </div>
          <div className={styles.officerGrid}>
            <div className={styles.officerCard}>
              <strong>관장</strong>
              <div className={styles.field}><label htmlFor="manager-name">성명</label><input id="manager-name" value={officers.manager.name} onChange={(e) => updateOfficer('manager', 'name', e.target.value)} placeholder="관장 성명" /></div>
              <div className={styles.field}><label htmlFor="manager-phone">연락처</label><input id="manager-phone" value={officers.manager.phone} onChange={(e) => updateOfficer('manager', 'phone', e.target.value)} placeholder="010-0000-0000" /></div>
            </div>
            <div className={styles.officerCard}>
              <strong>회장</strong>
              <div className={styles.field}><label htmlFor="president-name">성명</label><input id="president-name" value={officers.president.name} onChange={(e) => updateOfficer('president', 'name', e.target.value)} placeholder="회장 성명" /></div>
              <div className={styles.field}><label htmlFor="president-phone">연락처</label><input id="president-phone" value={officers.president.phone} onChange={(e) => updateOfficer('president', 'phone', e.target.value)} placeholder="010-0000-0000" /></div>
            </div>
            <div className={styles.officerCard}>
              <strong>총무</strong>
              <div className={styles.field}><label htmlFor="secretary-name">성명</label><input id="secretary-name" value={officers.secretary.name} onChange={(e) => updateOfficer('secretary', 'name', e.target.value)} placeholder="총무 성명" /></div>
              <div className={styles.field}><label htmlFor="secretary-phone">연락처</label><input id="secretary-phone" value={officers.secretary.phone} onChange={(e) => updateOfficer('secretary', 'phone', e.target.value)} placeholder="010-0000-0000" /></div>
            </div>
          </div>

          <div className={styles.memberHeader}>
            <div>
              <h3>등록 회원 명단</h3>
              <span className={styles.unlimited}>한 번에 최대 200명 · 현재 {activeMemberCount}명 입력</span>
            </div>
            <button className={styles.addButton} type="button" onClick={addMember}>+ 회원 추가</button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순</th><th>성명</th><th>생년월일</th><th>성별</th><th>부수</th><th>주소(읍·면·동)</th><th>직위</th><th>연락처</th><th>구분</th><th>국적(외국인)</th><th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => {
                  const options = rankOptions(member.gender);
                  return (
                    <tr key={member.id}>
                      <td>{index + 1}</td>
                      <td><input value={member.name} onChange={(e) => updateMember(member.id, 'name', e.target.value)} /></td>
                      <td><input value={member.birthDate} onChange={(e) => updateMember(member.id, 'birthDate', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="900101" inputMode="numeric" /></td>
                      <td><select value={member.gender} onChange={(e) => updateGender(member.id, e.target.value)}><option value="">선택</option><option value="남">남</option><option value="여">여</option></select></td>
                      <td>
                        <select value={member.rank} disabled={!member.gender} onChange={(e) => updateMember(member.id, 'rank', e.target.value)}>
                          <option value="">{member.gender ? '부수 선택' : '성별 먼저 선택'}</option>
                          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </td>
                      <td><input value={member.address} onChange={(e) => updateMember(member.id, 'address', e.target.value)} placeholder="군산시 나운동" /></td>
                      <td><select value={member.position} onChange={(e) => updateMember(member.id, 'position', e.target.value)}>{positions.map((position) => <option key={position} value={position}>{position}</option>)}</select></td>
                      <td><input value={member.phone} onChange={(e) => updateMember(member.id, 'phone', e.target.value)} placeholder="010-0000-0000" /></td>
                      <td><select value={member.registrationType} onChange={(e) => updateMember(member.id, 'registrationType', e.target.value)}>{registrationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></td>
                      <td><input value={member.nationality} onChange={(e) => updateMember(member.id, 'nationality', e.target.value)} placeholder="선택사항" /></td>
                      <td><button className={styles.deleteButton} type="button" onClick={() => removeMember(member.id)} aria-label={`${member.name || index + 1} 삭제`}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.summary}>
            <div>
              <strong>등록 대상 {activeMemberCount}명</strong>
              <span>회원 수만큼 엑셀 행이 자동으로 늘어납니다.</span>
              <span className={styles.saveStatus}>{savedTimeText(lastSavedAt)}</span>
            </div>
            <div className={styles.actions}>
              <button className={styles.secondary} type="button" onClick={saveDraft}>입력내용 저장</button>
              <button className={styles.secondary} type="button" onClick={submitRoster}>협회에 등록 제출</button>
              <button className={styles.primary} type="button" disabled={downloading} onClick={downloadExcel}>{downloading ? '엑셀 만드는 중...' : '2026 제출용 Excel 다운로드'}</button>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}
        </div>
      </div>
    </>
  );
}
