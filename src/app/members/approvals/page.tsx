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
              ? '회원등록 변동과 기존 소속 구장 회장 확인이 끝난 이적 요청 등 관리자가 처리할 업무를 표시합니다.'
              : user.name + ' 회장님이 기존 소속 회원의 이적 요청을 확인하고 승인합니다.'}
          </p>
        </div>
      </section>

      <section className="siteShell pageContent">
        <div className="workflowPanel">
          <h2>{admin ? '관리자 업무 알림' : '기존 소속 구장 이적 승인'}</h2>
          <p>
            {admin
              ? '기존 소속 구장 회장 확인이 완료된 이적 요청이 관리자에게 전달됩니다. 관리자는 이적동의서와 이적·소속변경 신청서 두 문서를 함께 확인하고 보관합니다.'
              : '본인 구장 소속 회원의 이적 신청만 표시됩니다. 승인 시 기존 소속 구장 회장 확인으로 처리되며, 새 소속 구장 회장의 서명은 필요하지 않습니다.'}
          </p>
        </div>
      </section>
    </>
  );
}
