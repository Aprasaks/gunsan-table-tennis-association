'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './registration.module.css';
import { clearSession, getCurrentUser, type MvpUser } from '@/lib/mvpAuth';

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

type Draft = {
  clubName: string;
  clubAddress: string;
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
  const [members, setMembers] = useState<RegistrationMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (!registrationManagers.has(currentUser.position)) {
      alert('회원등록 권한이 없습니다. 회장, 부회장, 총무만 회원등록 업무를 이용할 수 있습니다.');
      router.replace('/members');
      return;
    }

    setUser(currentUser);
    const draftKey = `gunsan-tt-registration-draft-${currentUser.id}`;
    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as Draft;
        setClubName(draft.clubName || currentUser.club);
        setClubAddress(draft.clubAddress || '');
        setMembers(draft.members?.length ? draft.members : []);
        setLastSavedAt(draft.savedAt || '');
        setMessage('저장된 입력내용을 불러왔습니다.');
        setLoaded(true);
        return;
      } catch {
        localStorage.removeItem(draftKey);
      }
    }

    setClubName(currentUser.club);
    setMembers([{
      ...blankMember('member-1'),
      name: currentUser.name,
      gender: currentUser.gender,
      position: currentUser.position,
      phone: currentUser.phone,
    }]);
    setLoaded(true);
  }, [router]);

  useEffect(() => {
    if (!loaded || !user) return;

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const draft: Draft = { clubName, clubAddress, members, savedAt };
      localStorage.setItem(`gunsan-tt-registration-draft-${user.id}`, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [clubName, clubAddress, loaded, members, user]);

  function updateMember(id: string, field: keyof RegistrationMember, value: string) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, [field]: value } : member));
  }

  function updateGender(id: string, gender: string) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, gender, rank: '' } : member));
  }

  function addMember() {
    if (members.length >= 31) {
      setError('원본 엑셀 양식은 최대 31명까지 입력할 수 있습니다.');
      return;
    }
    setError('');
    setMembers((current) => [...current, blankMember(crypto.randomUUID())]);
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  function validate() {
    if (!clubName.trim() || !clubAddress.trim()) return '동호회명과 동호회 주소를 입력해주세요.';
    if (members.length === 0) return '등록할 회원을 한 명 이상 추가해주세요.';

    const incomplete = members.find((member) => !member.name.trim() || !member.birthDate.trim() || !member.gender || !member.rank.trim() || !member.address.trim() || !member.position || !member.phone.trim());
    if (incomplete) return '회원 명단의 성명, 생년월일, 성별, 부수, 주소, 직위, 연락처를 모두 입력해주세요.';
    return '';
  }

  function saveDraft() {
    if (!user) return;
    const savedAt = new Date().toISOString();
    const draft: Draft = { clubName, clubAddress, members, savedAt };
    localStorage.setItem(`gunsan-tt-registration-draft-${user.id}`, JSON.stringify(draft));
    setLastSavedAt(savedAt);
    setError('');
    setMessage(`입력내용을 저장했습니다. (${new Date(savedAt).toLocaleTimeString('ko-KR')})`);
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
          members: members.map(({ id, ...member }) => member),
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
      setMessage('원본 양식에 회원정보를 채운 엑셀 파일을 생성했습니다.');
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
    return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;
  }

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 회원등록/이적 &gt; 회원등록</span>
          <h1>2026 회원등록 검증</h1>
          <p>동호회 명단을 입력한 뒤 전라북도탁구협회 원본 양식으로 바로 내려받습니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <div className={styles.panel}>
          <div className={styles.topbar}>
            <div>
              <h2>{user.name}님 회원등록</h2>
              <p>관장·회장·총무로 입력된 회원은 엑셀 상단 담당자 정보에도 자동으로 들어갑니다.</p>
            </div>
            <button className={styles.logout} type="button" onClick={logout}>로그아웃</button>
          </div>

          <p className={styles.notice}>회원등록 업무는 회장·부회장·총무만 이용할 수 있습니다. 입력내용은 이 브라우저에 자동 저장되며, 아래 저장상태에서 마지막 저장 시각을 확인할 수 있습니다.</p>

          <div className={styles.clubGrid}>
            <div className={styles.field}>
              <label htmlFor="club-name">동호회(직장명)</label>
              <input id="club-name" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="예: 웰빙탁구클럽" />
            </div>
            <div className={styles.field}>
              <label htmlFor="club-address">동호회 주소</label>
              <input id="club-address" value={clubAddress} onChange={(e) => setClubAddress(e.target.value)} placeholder="예: 군산시 나운동" />
            </div>
          </div>

          <div className={styles.memberHeader}>
            <h3>등록 회원 명단 ({members.length}/31)</h3>
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
              <strong>등록 대상 {members.length}명</strong>
              <span>입력한 순서대로 원본 엑셀 1번부터 채워집니다.</span>
              <span className={styles.saveStatus}>{savedTimeText(lastSavedAt)}</span>
            </div>
            <div className={styles.actions}>
              <button className={styles.secondary} type="button" onClick={saveDraft}>입력내용 저장</button>
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
