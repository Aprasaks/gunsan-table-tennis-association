import Link from 'next/link';
import { createAdminServerSupabase } from '@/lib/supabase/server';
import { staticTournaments } from '@/lib/staticTournaments';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

type HomePost = {
  id: string;
  title: string;
  created_at: string;
  author_name: string | null;
};
type HomeTournament = {
  id: string;
  title: string;
  event_start_date: string;
  event_end_date: string | null;
  venue: string | null;
  status: string;
  source_url: string | null;
};

const quickServices = [
  { href: '/members', title: '회원등록 · 이적', description: '등록 신청과 소속 변경 업무' },
  { href: '/schedule', title: '대회일정', description: '대회 일정과 접수 정보 확인' },
  { href: '/league', title: '동호인리그', description: '군산 동호인리그 안내' },
  { href: '/division', title: '디비전리그', description: '디비전리그 정보 확인' },
];

function shortDate(date: string) {
  return date ? date.slice(5, 7) + '.' + date.slice(8, 10) : '-';
}

function postDate(date: string) {
  return date ? date.slice(0, 10).replaceAll('-', '.') : '-';
}

function formatPeriod(start: string, end: string | null) {
  return end && end !== start ? shortDate(start) + ' ~ ' + shortDate(end) : shortDate(start);
}

function staticToHome(): HomeTournament[] {
  return staticTournaments
    .filter((item) => item.visibility === 'public')
    .map((item) => ({
      id: item.id,
      title: item.title,
      event_start_date: item.eventStartDate,
      event_end_date: item.eventEndDate,
      venue: item.venue,
      status: item.status,
      source_url: item.sourceUrl,
    }));
}

function combineTournaments(rows: HomeTournament[], imported: HomeTournament[]) {
  const selected = new Map<string, HomeTournament>();
  for (const tournament of [...rows, ...imported]) {
    if (!tournament.event_start_date) continue;
    // 같은 출처의 수집 대회와 관리자 등록 대회는 한 번만 표시한다.
    const key = tournament.source_url || tournament.id;
    if (!Array.from(selected.values()).some((item) => item.source_url && item.source_url === tournament.source_url)) {
      if (!selected.has(key)) selected.set(key, tournament);
    }
  }
  return Array.from(selected.values());
}

export default async function Home() {
  const client = createAdminServerSupabase();
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const results = client ? await Promise.all([
    client.from('mvp_posts').select('id,title,created_at,author_name')
      .eq('kind', 'notice').eq('visibility', 'public')
      .order('created_at', { ascending: false }).limit(5),
    client.from('mvp_posts').select('id,title,created_at,author_name')
      .eq('kind', 'board').eq('visibility', 'public')
      .order('created_at', { ascending: false }).limit(4),
    client.from('tournaments').select('id,title,event_start_date,event_end_date,venue,status,source_url')
      .eq('visibility', 'public')
      .gte('event_start_date', today)
      .order('event_start_date', { ascending: true }).limit(12),
    client.from('tournaments').select('id,title,event_start_date,event_end_date,venue,status,source_url')
      .eq('visibility', 'public')
      .lt('event_start_date', today)
      .order('event_start_date', { ascending: false }).limit(12),
  ]) : null;

  const notices = (results?.[0].data ?? []) as HomePost[];
  const boardPosts = (results?.[1].data ?? []) as HomePost[];
  const databaseTournaments = [
    ...((results?.[2].data ?? []) as HomeTournament[]),
    ...((results?.[3].data ?? []) as HomeTournament[]),
  ];
  const tournaments = combineTournaments(databaseTournaments, staticToHome());
  const upcoming = tournaments
    .filter((item) => (item.event_end_date || item.event_start_date) >= today)
    .sort((a, b) => a.event_start_date.localeCompare(b.event_start_date))
    .slice(0, 4);
  const recent = tournaments
    .filter((item) => (item.event_end_date || item.event_start_date) < today)
    .sort((a, b) => b.event_start_date.localeCompare(a.event_start_date))
    .slice(0, 4);
  const showingUpcoming = upcoming.length > 0;
  const visibleSchedules = showingUpcoming ? upcoming : recent;

  return (
    <>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className="siteShell">
          <div className={styles.heroInner}>
            <span className={styles.heroLabel}>GUNSAN TABLE TENNIS ASSOCIATION <i aria-hidden="true" /></span>
            <h1 id="home-title">탁구로 하나 되는 군산,<br />함께하는 우리.</h1>
            <p>공지사항부터 대회일정, 회원등록과 이적까지.<br className={styles.heroDesktopBreak} /> 군산시 탁구 소식을 한곳에서 확인하세요.</p>
            <div className={styles.heroActions}>
              <Link href="/schedule" className={styles.heroPrimary}>대회일정 확인 <span aria-hidden="true">↗</span></Link>
              <Link href="/members" className={styles.heroSecondary}>회원등록 · 이적 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.services} aria-label="주요 서비스">
        <div className="siteShell">
          <div className={styles.serviceGrid}>
            {quickServices.map((service, index) => (
              <Link href={service.href} key={service.href} className={styles.service}>
                <small className={styles.serviceNumber}>{String(index + 1).padStart(2, '0')}</small>
                <strong>{service.title}</strong>
                <span>{service.description}</span>
                <span className={styles.serviceArrow} aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className={'siteShell ' + styles.homeContent}>
        <div className={styles.introRow}>
          <span>GUNSAN TTA · INFORMATION</span>
          <p>새로운 소식과 예정된 일정을 빠르게 확인하세요.</p>
        </div>
        <div className={styles.primaryGrid}>
          <section className={styles.section} aria-labelledby="home-notice-heading">
            <div className={styles.sectionHeading}>
              <h2 id="home-notice-heading">공지사항</h2>
              <Link href="/notice">전체보기 <span aria-hidden="true">›</span></Link>
            </div>
            <div className={styles.list}>
              {notices.length === 0 && (
                <p className={styles.empty}>
                  {!client || results?.[0].error ? '공지사항을 불러오지 못했습니다.' : '등록된 공지사항이 없습니다.'}
                </p>
              )}
              {notices.map((post, index) => (
                <Link href={'/notice/' + post.id} key={post.id} className={styles.postLink}>
                  <span className={styles.postLabel}>{index === 0 ? '최근' : '공지'}</span>
                  <span className={styles.postTitle}>{post.title}</span>
                  <time dateTime={post.created_at.slice(0, 10)}>{postDate(post.created_at)}</time>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="home-schedule-heading">
            <div className={styles.sectionHeading}>
              <h2 id="home-schedule-heading">{showingUpcoming ? '예정 대회' : '최근 대회'}</h2>
              <Link href="/schedule">대회일정 전체보기 <span aria-hidden="true">›</span></Link>
            </div>
            {!showingUpcoming && (
              <p className={styles.scheduleNote}>
                예정된 대회가 등록되지 않아 최근 대회 정보를 표시합니다.
              </p>
            )}
            <div className={styles.list}>
              {visibleSchedules.length === 0 && (
                <p className={styles.empty}>
                  {!client && staticTournaments.length === 0 ? '대회 정보를 불러오지 못했습니다.' : '등록된 대회 정보가 없습니다.'}
                </p>
              )}
              {visibleSchedules.map((event) => (
                <Link href={'/schedule/' + event.id} key={event.id} className={styles.eventLink}>
                  <time className={styles.eventDate}>{formatPeriod(event.event_start_date, event.event_end_date)}</time>
                  <span className={styles.eventBody}>
                    <strong>{event.title}</strong>
                    {event.venue && <small>{event.venue}</small>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.secondaryGrid}>
          <section className={styles.section} aria-labelledby="home-board-heading">
            <div className={styles.sectionHeading}>
              <h2 id="home-board-heading">게시판</h2>
              <Link href="/board">전체보기 <span aria-hidden="true">›</span></Link>
            </div>
            <div className={styles.list}>
              {boardPosts.length === 0 && (
                <p className={styles.empty}>
                  {!client || results?.[1].error ? '게시글을 불러오지 못했습니다.' : '등록된 게시글이 없습니다.'}
                </p>
              )}
              {boardPosts.map((post) => (
                <Link href={'/board/' + post.id} key={post.id} className={styles.postLink}>
                  <span className={styles.boardLabel}>자유</span>
                  <span className={styles.postTitle}>{post.title}</span>
                  <time dateTime={post.created_at.slice(0, 10)}>{postDate(post.created_at)}</time>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.infoSection} aria-labelledby="home-info-heading">
            <div className={styles.sectionHeading}>
              <h2 id="home-info-heading">협회 안내</h2>
              <Link href="/organization">조직도 보기 <span aria-hidden="true">›</span></Link>
            </div>
            <p>회원등록과 이적신청은 로그인 후 소속 클럽의 담당자 권한에 따라 이용할 수 있습니다.</p>
            <Link href="/members" className={styles.infoLink}>회원등록 · 이적 이용안내 <span aria-hidden="true">›</span></Link>
          </section>
        </div>
      </div>
    </>
  );
}
