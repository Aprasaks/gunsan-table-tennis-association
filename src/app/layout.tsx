import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import SiteNavigation from './SiteNavigation';
import AuthStatus from './AuthStatus';
import './globals.css';
import './readability.css';
import './feature-cards.css';
import './sticky-footer.css';
import './notice.css';
import './board.css';
import './schedule.css';
import './admin-controls.css';
import './site-header.css';

export const metadata: Metadata = {
  title: '군산시탁구협회',
  description: '군산시탁구협회 공식 홈페이지 - 공지사항, 동호인리그, 디비전리그, 대회일정, 게시판, 회원등록 및 이적',
};

function AssociationLogo() {
  return (
    <Image
      className="associationLogoImage"
      src="/images/association-logo.png"
      alt="군산시탁구협회 로고"
      width={1336}
      height={324}
      priority
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
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
            </div>
          </div>

        </header>

        <SiteNavigation />

        <main>{children}</main>

        <footer className="siteFooter">
          <div className="siteShell footerInner">
            <div>
              <strong>군산시탁구협회</strong>
              <p>군산시 탁구 동호인과 함께하는 공식 운영 홈페이지</p>
            </div>
            <p><Link href="/privacy">개인정보 처리 안내</Link> · © Gunsan TableTennis Association</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
