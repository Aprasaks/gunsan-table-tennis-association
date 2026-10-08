import styles from '../auth.module.css';

export default function PrivacyPage() {
  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 개인정보 처리 안내</span>
          <h1>개인정보 처리 안내</h1>
          <p>군산시탁구협회 홈페이지에서 회원정보가 어떻게 사용되는지 안내합니다.</p>
        </div>
      </section>
      <div className="siteShell pageContent">
        <article className={styles.policy}>
          <h2>회원정보 수집·이용 안내</h2>
          <h3>수집하는 정보</h3>
          <p>회원가입 시 이름, 생년월일 6자리, 성별, 휴대폰번호, 소속, 부수를 수집합니다. 구장 회장 계정은 이적동의서 등 협회 행정 문서 처리를 위해 서명 이미지를 추가로 등록할 수 있습니다.</p>
          <h3>이용 목적</h3>
          <ul>
            <li>회원 로그인과 본인 계정 구분</li>
            <li>군산시탁구협회 회원 명부 및 소속·부수 관리</li>
            <li>회원등록, 이적 신청, 승인 및 관련 문서 생성</li>
            <li>협회 운영에 필요한 공지·업무 처리</li>
          </ul>
          <h3>보관과 처리</h3>
          <p>회원정보는 협회 회원 관리와 행정 업무에 필요한 기간 동안 관리합니다. 탈퇴 또는 비활성 처리된 회원은 일반 로그인이 제한되며, 협회 업무상 보존이 필요한 기록은 운영 목적에 필요한 범위에서 보관할 수 있습니다.</p>
          <h3>비밀번호</h3>
          <p>회원 비밀번호는 원문을 확인할 수 있는 형태로 저장하지 않습니다. 비밀번호를 잊은 경우 관리자가 임시 비밀번호를 발급하고 회원이 로그인 후 새 비밀번호로 변경하는 방식으로 처리합니다.</p>
          <h3>회원의 요청</h3>
          <p>본인의 회원정보 수정, 계정 비활성 또는 기타 개인정보 관련 요청이 필요한 경우 군산시탁구협회 홈페이지 관리자에게 요청할 수 있습니다.</p>
        </article>
      </div>
    </>
  );
}
