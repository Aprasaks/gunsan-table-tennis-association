import Link from 'next/link';

export default function MembersPage() {
  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 회원등록·이적</span><h1>회원등록 · 이적</h1><p>분기별 회원등록과 클럽 이적 업무를 온라인으로 처리합니다.</p></div></section>
      <section className="siteShell pageContent">
        <div className="memberServiceGrid">
          <article className="memberServiceCard">
            <span>01</span><h2>분기 회원등록</h2><p>클럽 담당자가 기존 회원을 확인하고 신규 회원을 추가한 뒤 분기 등록을 제출합니다.</p>
            <Link href="/login">로그인 후 등록하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>02</span><h2>회원 이적신청</h2><p>현재 소속과 이적할 클럽을 선택하고 이적 신청을 진행합니다.</p>
            <Link href="/login">이적 신청하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>03</span><h2>클럽 승인</h2><p>클럽 회장 또는 총무가 신청 내용을 확인하고 등록된 서명을 이용해 승인합니다.</p>
            <Link href="/login">승인 업무 보기</Link>
          </article>
        </div>
      </section>
    </>
  );
}
