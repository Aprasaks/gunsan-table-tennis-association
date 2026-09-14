'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import { getUsers, hashPassword, normalizePhone, setAdminSession, setSession } from '@/lib/mvpAuth';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const loginValue = identifier.trim();

    if (loginValue.toLowerCase() === 'admin') {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginValue.toLowerCase(), password }),
      });
      const result = await response.json().catch(() => ({ ok: false, message: '관리자 로그인 처리 중 오류가 발생했습니다.' })) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? '관리자 로그인에 실패했습니다.');
        return;
      }

      setAdminSession();
      router.push('/admin');
      return;
    }

    const normalizedPhone = normalizePhone(loginValue);
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
    router.push('/');
  }

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 로그인</span>
          <h1>로그인</h1>
          <p>회원은 휴대폰번호로, 관리자는 관리자 아이디로 로그인합니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <form className={styles.wrap} onSubmit={handleSubmit}>
          <h2>로그인</h2>
          {message && <p className={styles.message}>{message}</p>}

          <div className={styles.row}>
            <label htmlFor="identifier">휴대폰번호 또는 관리자 아이디</label>
            <input id="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="010-0000-0000 또는 관리자 아이디" autoComplete="username" />
          </div>
          <div className={styles.row}>
            <label htmlFor="password">비밀번호</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password" />
          </div>

          <button type="submit" className={styles.action}>로그인</button>
          <div className={styles.links}>
            <Link href="/signup">회원가입</Link>
            <span>관리자 로그인 후 관리화면으로 이동합니다.</span>
          </div>
        </form>
      </div>
    </>
  );
}
