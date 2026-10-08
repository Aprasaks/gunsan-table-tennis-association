import Link from 'next/link';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 비밀번호 찾기</span>
          <h1>비밀번호 찾기</h1>
          <p>회원 비밀번호는 확인할 수 없으며, 필요한 경우 안전하게 초기화합니다.</p>
        </div>
      </section>
      <div className="siteShell pageContent">
        <section className={styles.wrap}>
          <h2>비밀번호 초기화 안내</h2>
          <p className={styles.note}>군산시탁구협회 홈페이지는 별도의 문자·이메일 본인인증 서비스를 사용하지 않습니다. 휴대폰번호와 생년월일만으로 비밀번호를 바꾸는 방식은 계정 보호에 취약할 수 있어 제공하지 않습니다.</p>
          <p>비밀번호를 잊은 경우 협회 관리자에게 본인 확인 후 초기화를 요청해주세요. 관리자는 회원 명부에서 임시 비밀번호를 발급할 수 있으며, 임시 비밀번호로 로그인한 뒤 정보수정에서 새 비밀번호로 변경하면 됩니다.</p>
          <div className={styles.links}>
            <Link href="/login">로그인으로 돌아가기</Link>
            <Link href="/signup">회원가입</Link>
          </div>
        </section>
      </div>
    </>
  );
}
