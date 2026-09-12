'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import { getUsers, hashPassword, normalizePhone, saveUsers } from '@/lib/mvpAuth';

const positions = ['회원', '관장', '회장', '부회장', '총무', '재무', '이사', '기타'];

export default function SignupPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    gender: '' as '' | '남' | '여',
    phone: '',
    club: '',
    position: '회원',
    password: '',
    passwordConfirm: '',
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const phone = normalizePhone(form.phone);
    if (!form.name.trim() || !form.gender || !phone || !form.club.trim() || !form.password) {
      setMessage('모든 필수 항목을 입력해주세요.');
      return;
    }
    if (phone.length < 10 || phone.length > 11) {
      setMessage('휴대폰번호를 확인해주세요.');
      return;
    }
    if (form.password.length < 4) {
      setMessage('비밀번호는 4자 이상 입력해주세요.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setMessage('비밀번호가 서로 다릅니다.');
      return;
    }

    const users = getUsers();
    if (users.some((user) => user.phone === phone)) {
      setMessage('이미 가입된 휴대폰번호입니다.');
      return;
    }

    const passwordHash = await hashPassword(form.password);
    users.push({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      gender: form.gender,
      phone,
      club: form.club.trim(),
      position: form.position,
      passwordHash,
    });
    saveUsers(users);
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

          <div className={styles.row}>
            <label htmlFor="name">이름</label>
            <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름을 입력하세요" autoComplete="name" />
          </div>

          <div className={styles.row}>
            <label htmlFor="gender">성별</label>
            <select id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as '' | '남' | '여' })}>
              <option value="">성별을 선택하세요</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>

          <div className={styles.row}>
            <label htmlFor="phone">휴대폰번호</label>
            <input id="phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" autoComplete="tel" />
          </div>

          <div className={styles.row}>
            <label htmlFor="club">소속 구장/클럽</label>
            <input id="club" value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} placeholder="예: 웰빙탁구클럽" />
          </div>

          <div className={styles.row}>
            <label htmlFor="position">직책</label>
            <select id="position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              {positions.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </div>

          <div className={styles.row}>
            <label htmlFor="password">비밀번호</label>
            <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="비밀번호를 입력하세요" autoComplete="new-password" />
          </div>

          <div className={styles.row}>
            <label htmlFor="password-confirm">비밀번호 확인</label>
            <input id="password-confirm" type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} placeholder="비밀번호를 다시 입력하세요" autoComplete="new-password" />
          </div>

          <button className={styles.action} type="submit">가입하기</button>
          <div className={styles.links}>
            <Link href="/login">이미 회원이신가요? 로그인</Link>
          </div>
        </form>
      </div>
    </>
  );
}
