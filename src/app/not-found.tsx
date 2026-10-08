import Link from 'next/link';
import styles from './auth.module.css';

export default function NotFound() {
  return (
    <div className="siteShell pageContent">
      <section className={styles.wrap}>
        <h2>페이지를 찾을 수 없습니다.</h2>
        <p className={styles.note}>주소가 변경되었거나 존재하지 않는 페이지입니다. 메뉴에서 필요한 정보를 다시 찾아주세요.</p>
        <div className={styles.links}><Link href="/">홈으로 돌아가기</Link></div>
      </section>
    </div>
  );
}
