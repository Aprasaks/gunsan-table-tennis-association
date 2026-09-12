import Link from 'next/link';

export default function MembersPage() {
  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 회원등록·이적</span><h1>회원등록 · 이적</h1><p>상·하반기 회원등록과 클럽 이적 업무를 온라인으로 처리합니다.</p></div></section>
      <section className="siteShell pageContent">
        <div className="memberServiceGrid">
          <article className="memberServiceCard">
            <span>01</span><h2>상·하반기 회원등록</h2><p>등록 회원 명단을 입력하고 전라북도탁구협회 제출용 Excel 파일을 바로 생성합니다.</p>
            <Link href="/members/register">회원등록 시작하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>02</span><h2>회원 이적신청</h2><p>기존 클럽 회장부터 새 클럽 회장, 협회장까지 이어지는 이적 흐름을 처리합니다.</p>
            <Link href="/login">이적 신청하기</Link>
          </article>
          <article className="memberServiceCard">
            <span>03</span><h2>승인 알림</h2><p>이적 확인이 필요한 회장과 협회장에게 처리할 문서를 알림으로 보여줍니다.</p>
            <Link href="/login">승인 업무 보기</Link>
          </article>
        </div>
      </section>
    </>
  );
}
