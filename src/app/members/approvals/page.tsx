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
      alert('승인 업무는 회장 또는 관리자만 확인할 수 있습니다.');
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
          <span className="crumb">HOME / 회원등록·이적 / 승인알림</span>
          <h1>이적 승인 알림</h1>
          <p>{admin ? '관리자가 최종 확인해야 할 전체 승인 요청을 이곳에 표시합니다.' : `${user.name} 회장님이 확인해야 할 이적 요청을 이곳에 표시합니다.`}</p>
        </div>
      </section>
      <section className="siteShell pageContent">
        <div className="workflowPanel">
          <h2>{admin ? '전체 승인 요청' : '확인요망 이적 요청'}</h2>
          <p>현재 검증 단계에서는 승인 목록 화면만 연결했습니다. 다음 단계에서 실제 이적 요청과 승인 버튼을 붙이면 됩니다.</p>
        </div>
      </section>
    </>
  );
}
