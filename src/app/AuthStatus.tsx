'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, clearSession, getCurrentUser, isAdmin, type MvpUser } from '@/lib/mvpAuth';

export default function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
    };
  }, []);

  async function logout() {
    if (isAdmin(user)) await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    clearSession();
    router.push('/');
  }

  if (!user) {
    return <><Link href="/login">로그인</Link><i aria-hidden="true" /><Link href="/signup">회원가입</Link></>;
  }

  const admin = isAdmin(user);
  return <>
    <span>{admin ? '관리자님 환영합니다.' : user.name + ' 회원님 환영합니다.'}</span>
    <i aria-hidden="true" />
    <Link href={admin ? '/admin' : '/profile'}>{admin ? '관리화면' : '정보수정'}</Link>
    <i aria-hidden="true" />
    <button type="button" onClick={logout} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }}>로그아웃</button>
  </>;
}
