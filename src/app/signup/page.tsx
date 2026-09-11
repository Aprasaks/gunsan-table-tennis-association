import Link from 'next/link';

export default function SignupPage() {
  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 회원가입</span>
          <h1>회원가입</h1>
          <p>군산시탁구협회 회원 서비스를 이용하기 위한 기본 정보를 등록합니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <form className="loginWrap">
          <h2>회원 기본정보</h2>

          <div className="formRow">
            <label htmlFor="name">이름</label>
            <input id="name" type="text" placeholder="이름을 입력하세요" autoComplete="name" />
          </div>

          <div className="formRow">
            <label htmlFor="gender">성별</label>
            <select id="gender" defaultValue="">
              <option value="" disabled>성별을 선택하세요</option>
              <option value="male">남자</option>
              <option value="female">여자</option>
            </select>
          </div>

          <div className="formRow">
            <label htmlFor="phone">휴대폰번호</label>
            <input id="phone" type="tel" inputMode="numeric" placeholder="010-0000-0000" autoComplete="tel" />
          </div>

          <div className="formRow">
            <label htmlFor="venue">소속 구장</label>
            <input id="venue" type="text" placeholder="소속 구장을 입력하세요" />
          </div>

          <div className="formRow">
            <label htmlFor="position">직책</label>
            <select id="position" defaultValue="member">
              <option value="member">일반회원</option>
              <option value="president">회장</option>
              <option value="vice-president">부회장</option>
              <option value="secretary">총무</option>
              <option value="other">기타</option>
            </select>
            <small>직책 선택만으로 관리 권한이 생기지 않으며, 협회 확인 후 권한이 적용됩니다.</small>
          </div>

          <div className="formRow">
            <label htmlFor="password">비밀번호</label>
            <input id="password" type="password" placeholder="비밀번호를 입력하세요" autoComplete="new-password" />
          </div>

          <div className="formRow">
            <label htmlFor="password-confirm">비밀번호 확인</label>
            <input id="password-confirm" type="password" placeholder="비밀번호를 다시 입력하세요" autoComplete="new-password" />
          </div>

          <button className="primaryAction" type="button">가입하기</button>
          <div className="loginLinks">
            <Link href="/login">이미 회원이신가요? 로그인</Link>
          </div>
        </form>
      </div>
    </>
  );
}
