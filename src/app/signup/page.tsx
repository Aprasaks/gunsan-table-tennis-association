'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import { normalizePhone } from '@/lib/mvpAuth';

const maleRanks = [
  ['남 Ace', '선수부 (Ace)'],
  ['남 1부', '1부'],
  ['남 2부', '2부'],
  ['남 3부', '3부'],
  ['남 4부', '4부'],
  ['남 5부', '5부'],
  ['남 6부', '6부'],
  ['남 7부', '7부'],
  ['남 희망부', '희망부'],
];

const femaleRanks = [
  ['여 Ace', '선수부 (Ace)'],
  ['여 1부', '1부'],
  ['여 2부', '2부'],
  ['여 3부', '3부'],
  ['여 4부', '4부'],
  ['여 5부', '5부'],
  ['여 6부', '6부'],
  ['여 희망부', '희망부'],
];

export default function SignupPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    gender: '' as '' | '남' | '여',
    phone: '',
    club: '',
    rank: '',
    password: '',
    passwordConfirm: '',
  });

  const rankOptions = form.gender === '남' ? maleRanks : form.gender === '여' ? femaleRanks : [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const phone = normalizePhone(form.phone);
    if (!form.name.trim() || !form.birthDate || !form.gender || !phone || !form.club.trim() || !form.rank || !form.password) {
      setMessage('모든 필수 항목을 입력해주세요.');
      return;
    }
    if (!/^\d{6}$/.test(form.birthDate)) {
      setMessage('생년월일은 6자리 숫자로 입력해주세요. 예: 900101');
      return;
    }
    if (phone.length < 10 || phone.length > 11) {
      setMessage('휴대폰번호를 확인해주세요.');
      return;
    }
    if (form.password.length < 8) {
      setMessage('비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setMessage('비밀번호가 서로 다릅니다.');
      return;
    }

    const response = await fetch('/api/mvp/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, phone }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message ?? '가입하지 못했습니다.'); return; }
    alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    router.push('/login');
  }

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 회원가입</span>
          <h1>회원가입</h1>
          <p>군산시탁구협회 홈페이지 이용을 위한 기본 정보를 등록합니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <form className={styles.wrap} onSubmit={handleSubmit}>
          <h2>회원 기본정보</h2>
          {message && <p className={styles.message}>{message}</p>}

          <div className={styles.row}><label htmlFor="name">이름</label><input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름을 입력하세요" autoComplete="name" /></div>
          <div className={styles.row}><label htmlFor="birthDate">생년월일 <small>6자리</small></label><input id="birthDate" inputMode="numeric" maxLength={6} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} placeholder="예: 900101" autoComplete="bday" /></div>
          <div className={styles.row}><label htmlFor="gender">성별</label><select id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as '' | '남' | '여', rank: '' })}><option value="">성별을 선택하세요</option><option value="남">남</option><option value="여">여</option></select></div>
          <div className={styles.row}><label htmlFor="phone">핸드폰번호</label><input id="phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" autoComplete="tel" /></div>
          <div className={styles.row}><label htmlFor="club">소속</label><input id="club" value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} placeholder="소속 구장 또는 동호회를 입력하세요" /></div>
          <div className={styles.row}><label htmlFor="rank">부수</label><select id="rank" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} disabled={!form.gender}><option value="">{form.gender ? '부수를 선택하세요' : '성별을 먼저 선택하세요'}</option>{rankOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>

          <p>협회 직책과 구장 직책은 가입 후 관리자가 부여합니다.</p>

          <div className={styles.row}><label htmlFor="password">비밀번호</label><input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="비밀번호를 입력하세요" autoComplete="new-password" /></div>
          <div className={styles.row}><label htmlFor="password-confirm">비밀번호 확인</label><input id="password-confirm" type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} placeholder="비밀번호를 다시 입력하세요" autoComplete="new-password" /></div>

          <button className={styles.action} type="submit">가입하기</button>
          <div className={styles.links}><Link href="/login">이미 회원이신가요? 로그인</Link></div>
        </form>
      </div>

    </>
  );
}
