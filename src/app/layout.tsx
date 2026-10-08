import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import SiteNavigation from './SiteNavigation';
import AuthStatus from './AuthStatus';
import './globals.css';
import './readability.css';
import './sticky-footer.css';
import './notice.css';
import './board.css';
import './schedule.css';
import './admin-controls.css';
import './site-header.css';
import './association-theme.css';

export const metadata: Metadata = {
  title: '군산시탁구협회',
  description: '군산시탁구협회 공식 홈페이지 - 공지사항, 동호인리그, 디비전리그, 대회일정, 게시판, 회원등록 및 이적',
};

function AssociationLogo() {
  return (
    <Image
      className="associationLogoImage"
      src="/images/association-logo-2026.webp"
      alt="군산시탁구협회 로고"
      width={600}
      height={167}
      priority
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <a href="#main-content" className="skipToContent">본문 바로가기</a>
        <header className="siteHeader">
          <div className="utilityBar">
            <div className="siteShell utilityInner">
              <span className="utilityLabel">군산시 탁구 동호인 공식 홈페이지</span>
              <div className="utilityLinks">
                <AuthStatus />
              </div>
            </div>
          </div>

          <div className="brandArea">
            <div className="siteShell brandRow">
              <Link href="/" className="brandLogo" aria-label="군산시탁구협회 홈">
                <AssociationLogo />
              </Link>
              <div className="brandIdentity" aria-label="군산시탁구협회 홈페이지 안내">
                <span className="brandIdentityEyebrow">GUNSAN TABLE TENNIS ASSOCIATION</span>
                <strong>함께 즐기는 탁구, 함께 성장하는 군산</strong>
              </div>
            </div>
          </div>

        </header>

        <SiteNavigation />

        <main id="main-content">{children}</main>

        <footer className="siteFooter">
          <div className="siteShell footerInner">
            <div className="footerBrand">
              <span className="footerEyebrow">GUNSAN TABLE TENNIS ASSOCIATION</span>
              <strong>군산시탁구협회</strong>
              <p>군산시 탁구 동호인을 위한 공지, 대회와 회원 업무를 안내합니다.</p>
            </div>
            <nav className="footerNav" aria-label="하단 메뉴">
              <Link href="/organization">협회소개</Link>
              <Link href="/notice">공지사항</Link>
              <Link href="/schedule">대회일정</Link>
              <Link href="/members">회원등록 · 이적</Link>
              <Link href="/privacy">개인정보 처리 안내</Link>
            </nav>
          </div>
          <div className="siteShell footerBottom">
            <span>© Gunsan Table Tennis Association</span>
            <span>군산시탁구협회</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
