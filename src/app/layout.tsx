import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '군산시탁구협회',
  description: '군산시탁구협회 공식 홈페이지 - 공지사항, 조직도, 동호인리그, 디비전리그, 대회일정, 회원등록 및 이적',
};

const nav = [
  ['/notice', '공지사항'],
  ['/organization', '조직도'],
  ['/league', '동호인리그'],
  ['/division', '디비전리그'],
  ['/schedule', '대회일정'],
  ['/board', '게시판'],
  ['/members', '회원등록/이적'],
];

function AssociationLogo() {
  return (
    <div className="associationLogo">
      <svg className="associationMark" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="42" cy="42" r="27" fill="#1369ac" />
        <path d="M23 57c18-10 31-23 44-41" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <path d="M27 63c11 2 23 2 34-1 8-2 15-5 22-9" fill="none" stroke="#27a4d8" strokeWidth="5" strokeLinecap="round" />
        <path d="M21 72c15-5 30-4 45 2 7 3 14 3 21 0" fill="none" stroke="#148bd0" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 58h38M37 58V47M60 58V45M37 47l11 11M60 45L48 58" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="73" cy="18" r="7" fill="#e9eef2" stroke="#cfd8df" strokeWidth="1.5" />
        <path d="M15 69 31 53" stroke="#0b4f8a" strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="associationWordmark">
        <strong>군산시탁구협회</strong>
        <span>GUNSAN TABLE TENNIS ASSOCIATION</span>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="siteHeader">
          <div className="utilityBar">
            <div className="siteShell utilityInner">
              <span>군산시 탁구, 오늘도 더 가까이</span>
              <div className="utilityLinks">
                <Link href="/login">로그인</Link>
                <i aria-hidden="true" />
                <Link href="/signup">회원가입</Link>
              </div>
            </div>
          </div>

          <div className="brandArea">
            <div className="siteShell brandRow">
              <Link href="/" className="brandLogo" aria-label="군산시탁구협회 홈">
                <AssociationLogo />
              </Link>
              <div className="headerCityVisual" aria-hidden="true">
                <div>
                  <strong>시민과 함께하는 건강한 탁구</strong>
                  <span>동호인과 함께 만드는 즐거운 군산</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mainNavWrap">
            <div className="siteShell navShell">
              <Link href="/" className="homeNav" aria-label="홈">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.4 12 4l9 7.4v8.1a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z" /></svg>
              </Link>
              <nav className="desktopNav" aria-label="주요 메뉴">
                {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
              </nav>
              <details className="mobileMenu">
                <summary aria-label="메뉴 열기">☰ <span>메뉴</span></summary>
                <nav>
                  {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
                  <div className="mobileUtilityLinks">
                    <Link href="/login">로그인</Link>
                    <Link href="/signup">회원가입</Link>
                  </div>
                </nav>
              </details>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="siteFooter">
          <div className="siteShell footerInner">
            <div>
              <strong>군산시탁구협회</strong>
              <p>군산시 탁구 동호인과 함께하는 공식 운영 홈페이지</p>
            </div>
            <p>@ Gunsan TableTennis Association</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
