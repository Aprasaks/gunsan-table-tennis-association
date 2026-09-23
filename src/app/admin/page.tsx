'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || !isAdmin(currentUser)) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return <div className="siteShell pageContent">관리자 권한을 확인하고 있습니다.</div>;

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME / 관리자</span>
          <h1>협회 관리자</h1>
          <p>공지사항, 대회정보와 협회 승인 업무를 관리합니다.</p>
        </div>
      </section>

      <section className="siteShell pageContent">
        <div className="memberServiceGrid">
          <article className="memberServiceCard">
            <span>01</span>
            <h2>공지사항 관리</h2>
            <p>협회 공식 공지사항을 작성하고 공개하는 관리 영역입니다.</p>
            <Link href="/notice">공지사항 관리</Link>
          </article>
          <article className="memberServiceCard">
            <span>02</span>
            <h2>대회정보 관리</h2>
            <p>대회 일정과 참가 안내 등 대회 관련 정보를 등록하는 관리 영역입니다.</p>
            <Link href="/schedule">대회정보 관리</Link>
          </article>
          <article className="memberServiceCard">
            <span>03</span>
            <h2>전체 승인 업무</h2>
            <p>회원 이적 등 협회에서 최종 확인해야 하는 승인 업무를 확인합니다.</p>
            <Link href="/members/approvals">승인 업무 보기</Link>
          </article>
          <article className="memberServiceCard">
            <span>04</span>
            <h2>회원 직책 관리</h2>
            <p>등록 회원에게 협회 직책 또는 구장 직책을 부여하고 해제합니다.</p>
            <Link href="/admin/members">직책 관리하기</Link>
          </article>
        </div>
      </section>
    </>
  );
}
