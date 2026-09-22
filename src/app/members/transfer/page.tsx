'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin, type MvpUser } from '@/lib/mvpAuth';

export default function TransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (!isAdmin(currentUser) && currentUser.position !== '회장') {
      alert('이적 신청은 구장 회장 또는 관리자만 이용할 수 있습니다.');
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
          <span className="crumb">HOME / 회원등록·이적 / 이적신청</span>
          <h1>회원 이적신청</h1>
          <p>
            {admin
              ? '관리자 권한으로 회원 이적 신청 및 처리 흐름을 확인합니다.'
              : user.club + ' 회장 권한으로 소속 회원의 이적 신청을 진행합니다.'}
          </p>
        </div>
      </section>

      <section className="siteShell pageContent">
        <div className="workflowPanel">
          <h2>이적 처리 기준</h2>
          <p>
            이적 동의는 기존 소속 구장 회장의 확인과 서명으로 처리합니다.
            이적하는 새 구장의 회장 서명은 필요하지 않습니다.
          </p>
          <p style={{ marginTop: 12 }}>
            협회는 최종 처리 시 <strong>동호회(클럽) 이적동의서</strong>와
            <strong> 동호회(클럽) 이적·소속변경 신청서</strong> 두 문서를 모두 보관합니다.
          </p>
        </div>
      </section>
    </>
  );
}
