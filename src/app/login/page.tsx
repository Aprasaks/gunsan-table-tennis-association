import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 로그인</span>
          <h1>로그인</h1>
          <p>군산시탁구협회 회원은 휴대폰번호로 로그인합니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <form className="loginWrap">
          <h2>회원 로그인</h2>
          <div className="formRow">
            <label htmlFor="phone">휴대폰번호</label>
            <input id="phone" type="tel" inputMode="numeric" placeholder="010-0000-0000" autoComplete="tel" />
          </div>
          <div className="formRow">
            <label htmlFor="password">비밀번호</label>
            <input id="password" type="password" placeholder="비밀번호" autoComplete="current-password" />
          </div>
          <button type="button" className="primaryAction">로그인</button>
          <div className="loginLinks">
            <Link href="/signup">회원가입</Link>
            <a href="#">비밀번호 찾기</a>
          </div>
        </form>
      </div>
    </>
  );
}
