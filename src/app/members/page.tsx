'use client';

import Link from 'next/link';
import { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { canApproveAssociation, canSubmitClubRoster, getCurrentUser, isAdmin, isPersonalClub } from '@/lib/mvpAuth';

export default function MembersPage() {
  const router = useRouter();

  function openRegistration(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!canSubmitClubRoster(currentUser)) {
      alert('회원등록 권한이 없습니다. 소속 동호회 회장·총무만 회원등록 업무를 이용할 수 있습니다.');
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

    if (isAdmin(currentUser) || currentUser.position !== '회장' || isPersonalClub(currentUser.club)) {
      alert('이적 업무는 동호회 회장만 이용할 수 있습니다.');
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

    if (!canApproveAssociation(currentUser)) {
      alert('이적 최종 승인은 협회장·사무국장·총무만 이용할 수 있습니다.');
      return;
    }
    router.push('/members/approvals');
  }

  return (
    <>
      <h1 className="visuallyHidden">회원등록 · 이적</h1>
      <section className="siteShell pageContent">
        <div className="memberServiceGrid">
          <article className="memberServiceCard">
            <span>01</span><h2>회원등록</h2>
            <p className="memberServiceAccess"><span>이용 권한</span><strong>동호회 회장 · 총무만</strong></p>
            <Link href="/members/register" onClick={openRegistration}>회원등록 시작하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>02</span><h2>회원 이적신청</h2>
            <p className="memberServiceAccess"><span>이용 권한</span><strong>동호회 회장만</strong></p>
            <Link href="/members/transfer" onClick={openTransfer}>이적 신청하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>03</span><h2>협회 승인 업무</h2>
            <p className="memberServiceAccess"><span>이용 권한</span><strong>협회 임원진만 (협회장 · 사무국장 · 총무)</strong></p>
            <Link href="/members/approvals" onClick={openApprovals}>승인 업무 보기</Link>
          </article>
        </div>
      </section>
    </>
  );
}
