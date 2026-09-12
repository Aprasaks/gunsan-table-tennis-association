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
};

const positions = ['관장', '회장', '부회장', '총무', '재무', '이사', '회원', '기타'];
const registrationTypes = ['기존', '신규', '이적'];

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

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
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
    const draft: Draft = { clubName, clubAddress, members };
    localStorage.setItem(`gunsan-tt-registration-draft-${user.id}`, JSON.stringify(draft));
  }, [clubName, clubAddress, loaded, members, user]);

  function updateMember(id: string, field: keyof RegistrationMember, value: string) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, [field]: value } : member));
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
    setError('');
    setMessage('현재 입력내용을 이 브라우저에 저장했습니다.');
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
        const result = await response.json() as { message?: string };
        throw new Error(result.message || '엑셀 생성에 실패했습니다.');
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

          <p className={styles.notice}>이번 화면은 실제 업무 흐름을 먼저 검증하기 위한 버전입니다. 회원가입 정보와 등록 명단을 넣고 엑셀 파일이 원하는 위치에 정확히 들어가는지 확인해주세요.</p>

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
                {members.map((member, index) => (
                  <tr key={member.id}>
                    <td>{index + 1}</td>
                    <td><input value={member.name} onChange={(e) => updateMember(member.id, 'name', e.target.value)} /></td>
                    <td><input value={member.birthDate} onChange={(e) => updateMember(member.id, 'birthDate', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="900101" inputMode="numeric" /></td>
                    <td><select value={member.gender} onChange={(e) => updateMember(member.id, 'gender', e.target.value)}><option value="">선택</option><option value="남">남</option><option value="여">여</option></select></td>
                    <td><input value={member.rank} onChange={(e) => updateMember(member.id, 'rank', e.target.value)} placeholder="남 5부" /></td>
                    <td><input value={member.address} onChange={(e) => updateMember(member.id, 'address', e.target.value)} placeholder="군산시 나운동" /></td>
                    <td><select value={member.position} onChange={(e) => updateMember(member.id, 'position', e.target.value)}>{positions.map((position) => <option key={position} value={position}>{position}</option>)}</select></td>
                    <td><input value={member.phone} onChange={(e) => updateMember(member.id, 'phone', e.target.value)} placeholder="010-0000-0000" /></td>
                    <td><select value={member.registrationType} onChange={(e) => updateMember(member.id, 'registrationType', e.target.value)}>{registrationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></td>
                    <td><input value={member.nationality} onChange={(e) => updateMember(member.id, 'nationality', e.target.value)} placeholder="선택사항" /></td>
                    <td><button className={styles.deleteButton} type="button" onClick={() => removeMember(member.id)} aria-label={`${member.name || index + 1} 삭제`}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.summary}>
            <div>
              <strong>등록 대상 {members.length}명</strong>
              <span>입력한 순서대로 원본 엑셀 1번부터 채워집니다.</span>
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
