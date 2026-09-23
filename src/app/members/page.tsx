'use client';

import Link from 'next/link';
import { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';

const registrationManagers = new Set(['회장', '부회장', '총무']);

export default function MembersPage() {
  const router = useRouter();

  function requireLogin(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    event.preventDefault();
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    router.push(destination);
  }

  function openRegistration(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!isAdmin(currentUser) && !registrationManagers.has(currentUser.position)) {
      alert('회원등록 권한이 없습니다. 회장, 부회장, 총무 또는 관리자만 회원등록 업무를 이용할 수 있습니다.');
      return;
    }

    router.push('/members/register');
  }

  function openTransfer(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!isAdmin(currentUser) && currentUser.position !== '회장') {
      alert('이적 신청은 구장 회장 또는 관리자만 이용할 수 있습니다.');
      return;
    }

    router.push('/members/transfer');
  }

  function openApprovals(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    router.push('/members/approvals');
  }

  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 회원등록·이적</span><h1>회원등록 · 이적</h1><p>상·하반기 회원등록과 클럽 이적 업무를 온라인으로 처리합니다.</p></div></section>
      <section className="siteShell pageContent">
        <div className="memberServiceGrid">
          <article className="memberServiceCard">
            <span>01</span><h2>상·하반기 회원등록</h2><p>등록 회원 명단을 입력하고 전라북도탁구협회 제출용 Excel 파일을 바로 생성합니다.</p>
            <Link href="/members/register" onClick={openRegistration}>회원등록 시작하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>02</span><h2>회원 이적신청</h2><p>기존 소속 구장 회장이 이적을 확인하고, 협회에서 최종 처리하는 이적 흐름입니다.</p>
            <Link href="/members/transfer" onClick={openTransfer}>이적 신청하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>03</span><h2>알림 · 승인</h2><p>회원등록 변동과 이적 승인 등 권한에 따라 확인하거나 처리해야 할 업무 알림을 보여줍니다.</p>
            <Link href="/members/approvals" onClick={openApprovals}>알림 · 승인 보기</Link>
          </article>
        </div>
      </section>
    </>
  );
}
