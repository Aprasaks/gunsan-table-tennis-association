'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import { getUsers, hashPassword, normalizePhone, setSession } from '@/lib/mvpAuth';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const normalizedPhone = normalizePhone(phone);
    const user = getUsers().find((item) => item.phone === normalizedPhone);
    if (!user) {
      setMessage('가입된 회원정보를 찾을 수 없습니다.');
      return;
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      setMessage('비밀번호가 올바르지 않습니다.');
      return;
    }

    setSession(user.id);
    router.push('/members/register');
  }

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 로그인</span>
          <h1>로그인</h1>
          <p>군산시탁구협회 회원은 휴대폰번호로 로그인합니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <form className={styles.wrap} onSubmit={handleSubmit}>
          <h2>회원 로그인</h2>
          {message && <p className={styles.message}>{message}</p>}

          <div className={styles.row}>
            <label htmlFor="phone">휴대폰번호</label>
            <input id="phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" autoComplete="tel" />
          </div>
          <div className={styles.row}>
            <label htmlFor="password">비밀번호</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password" />
          </div>

          <button type="submit" className={styles.action}>로그인</button>
          <div className={styles.links}>
            <Link href="/signup">회원가입</Link>
            <span>회원등록 검증 화면으로 이동합니다.</span>
          </div>
        </form>
      </div>
    </>
  );
}
