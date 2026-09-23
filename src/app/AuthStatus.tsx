'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, canReviewAssociation, clearSession, getCurrentUser, isAdmin, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';

export default function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    syncUser();
    refreshCurrentUser().then((current) => { if (current) setUser(current); }).catch(() => null);
    window.addEventListener('storage', syncUser);
    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
    };
  }, []);

  useEffect(() => {
    if (!canReviewAssociation(user)) { setPending(0); return; }
    const update = async () => {
      const response = await fetch('/api/mvp/transfers', { cache: 'no-store' }).catch(() => null);
      if (!response?.ok) return;
      const result = await response.json();
      setPending((result.requests ?? []).filter((item: { status: string }) => item.status === 'pending_admin').length);
    };
    update();
    const interval = window.setInterval(update, 15000);
    return () => window.clearInterval(interval);
  }, [user?.id, user?.associationTitle]);

  async function logout() {
    if (isAdmin(user)) await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    else await fetch('/api/mvp/logout', { method: 'POST' }).catch(() => null);
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
    {canReviewAssociation(user) && <><i aria-hidden="true" /><Link href="/members/approvals">협회 승인 {pending > 0 ? '(' + pending + ')' : ''}</Link></>}
    <i aria-hidden="true" />
    <button type="button" onClick={logout} style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }}>로그아웃</button>
  </>;
}
