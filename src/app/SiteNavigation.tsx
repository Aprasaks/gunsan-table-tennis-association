'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import AuthStatus from './AuthStatus';

const navigationItems = [
  { href: '/organization', label: '협회소개' },
  { href: '/notice', label: '공지사항' },
  { href: '/league', label: '동호인리그' },
  { href: '/division', label: '디비전리그' },
  { href: '/schedule', label: '대회일정' },
  { href: '/board', label: '게시판' },
  { href: '/members', label: '회원등록/이적' },
] as const;

export default function SiteNavigation() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuRef.current) menuRef.current.open = false;
    };
    const closeOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false;
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, []);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <div className="mainNavWrap">
      <div className="siteShell navShell">
        <nav className="desktopNav" aria-label="주요 메뉴">
          {navigationItems.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link href={href} key={href} aria-current={active ? 'page' : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>
        <details className="mobileMenu" ref={menuRef}>
          <summary>
            <span>전체메뉴</span>
            <span className="mobileMenuIcon" aria-hidden="true"><span /><span /><span /></span>
          </summary>
          <div className="mobileMenuPanel">
            <nav className="mobileNav" aria-label="모바일 주요 메뉴">
              {navigationItems.map(({ href, label }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    href={href}
                    key={href}
                    aria-current={active ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="mobileUtilityLinks" onClick={closeMenu}>
              <AuthStatus />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
