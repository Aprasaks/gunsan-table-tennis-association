'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, canApproveAssociation, canReviewAssociation, clearSession, getCurrentUser, isAdmin, isPersonalClub, refreshCurrentUser, type MvpUser } from '@/lib/mvpAuth';

export default function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [pending, setPending] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    syncUser();
    refreshCurrentUser().then((current) => setUser(current)).catch(() => null);
    window.addEventListener('storage', syncUser);
    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
    };
  }, []);

  useEffect(() => {
    const officer = canReviewAssociation(user);
    const clubChair = Boolean(user && !isAdmin(user) && user.position === '회장' && !isPersonalClub(user.club));
    if (!officer && !clubChair) { setPending(0); setUnread(0); return; }
    const update = async () => {
      const [response, alertsResponse] = await Promise.all([
        officer ? fetch('/api/mvp/transfers', { cache: 'no-store' }).catch(() => null) : Promise.resolve(null),
        fetch('/api/mvp/alerts', { cache: 'no-store' }).catch(() => null),
      ]);
      if (response?.ok) {
        const result = await response.json();
        setPending(canApproveAssociation(user)
          ? (result.requests ?? []).filter((item: { status: string }) => item.status === 'pending_admin').length
          : 0);
      }
      if (alertsResponse?.ok) {
        const notifications = await alertsResponse.json();
        setUnread((notifications.alerts ?? []).filter((item: { read: boolean }) => !item.read).length);
      }
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
  const executiveDashboard = !admin && canReviewAssociation(user);
  return <>
    <span className="authGreeting">{admin ? '관리자' : user.name + ' 회원님'}</span>
    {admin && <><i aria-hidden="true" /><Link href="/admin/system">관리자 대시보드</Link></>}
    {executiveDashboard && <><i aria-hidden="true" /><Link href="/admin">임원 대시보드</Link></>}
    {!admin && <><i aria-hidden="true" /><Link href="/profile">정보수정</Link></>}
    {canApproveAssociation(user) && <><i aria-hidden="true" /><Link href="/members/approvals">협회 승인 {pending > 0 ? '(' + pending + ')' : ''}</Link></>}
    {canReviewAssociation(user) && <><i aria-hidden="true" /><Link href="/admin/notifications">임원 알림 {unread > 0 ? '(' + unread + ')' : ''}</Link></>}
    {!canReviewAssociation(user) && !admin && user.position === '회장' && !isPersonalClub(user.club) && <><i aria-hidden="true" /><Link href="/members/transfer">이적 요청 {unread > 0 ? '(' + unread + ')' : ''}</Link></>}
    <i aria-hidden="true" />
    <button type="button" onClick={logout} className="utilityLogout">로그아웃</button>
  </>;
}
