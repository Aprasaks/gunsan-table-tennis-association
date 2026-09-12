'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, clearSession, getCurrentUser, type MvpUser } from '@/lib/mvpAuth';

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

  function logout() {
    clearSession();
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link href="/login">로그인</Link>
        <i aria-hidden="true" />
        <Link href="/signup">회원가입</Link>
      </>
    );
  }

  return (
    <>
      <span className="welcomeUser">{user.name} 회원님 환영합니다.</span>
      <i aria-hidden="true" />
      <button className="utilityLogout" type="button" onClick={logout}>로그아웃</button>
    </>
  );
}
