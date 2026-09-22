'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin, type MvpUser } from '@/lib/mvpAuth';

export default function ApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.position !== '회장' && !isAdmin(currentUser)) {
      alert('알림 · 승인 업무는 회장 또는 관리자만 확인할 수 있습니다.');
      router.replace('/members');
      return;
    }

    setUser(currentUser);
  }, [router]);

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;

  const admin = isAdmin(user);

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME / 회원등록·이적 / 알림·승인</span>
          <h1>알림 · 승인</h1>
          <p>
            {admin
              ? '회원등록 변동과 회장 승인이 완료된 이적 요청 등 관리자가 확인해야 할 업무를 표시합니다.'
              : user.name + ' 회장님이 확인하고 승인해야 할 이적 요청을 표시합니다.'}
          </p>
        </div>
      </section>
      <section className="siteShell pageContent">
        <div className="workflowPanel">
          <h2>{admin ? '관리자 업무 알림' : '회장 승인 요청'}</h2>
          <p>
            {admin
              ? '회원등록 변동사항과 각 구장 회장 승인이 끝난 이적 요청이 이곳에 모입니다.'
              : '회원님의 소속 구장에 승인이 필요한 이적 요청이 이곳에 표시됩니다.'}
          </p>
        </div>
      </section>
    </>
  );
}
