'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type MvpUser } from '@/lib/mvpAuth';

export default function TransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    setUser(currentUser);
  }, [router]);

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME / 회원등록·이적 / 이적신청</span>
          <h1>회원 이적신청</h1>
          <p>{user.name} 회원님의 로그인 상태를 유지한 채 이적 신청 업무를 진행합니다.</p>
        </div>
      </section>
      <section className="siteShell pageContent">
        <div className="workflowPanel">
          <h2>이적 신청</h2>
          <p>이곳에 기존 클럽 → 새 클럽 이적 신청서 작성 기능을 이어서 붙일 예정입니다.</p>
        </div>
      </section>
    </>
  );
}
