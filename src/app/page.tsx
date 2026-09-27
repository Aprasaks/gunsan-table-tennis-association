import Link from 'next/link';

import { createAdminServerSupabase } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

type HomePost = { id: string; title: string; created_at: string; author_name: string };
type HomeTournament = { id: string; title: string; event_start_date: string; status: string };

export default async function Home() {
  const client = createAdminServerSupabase();
  const [noticeResult, boardResult, tournamentResult] = client ? await Promise.all([
    client.from('mvp_posts').select('id,title,created_at,author_name').eq('kind','notice').eq('visibility','public').order('created_at',{ascending:false}).limit(5),
    client.from('mvp_posts').select('id,title,created_at,author_name').eq('kind','board').order('created_at',{ascending:false}).limit(5),
    client.from('tournaments').select('id,title,event_start_date,status').eq('visibility','public').gte('event_start_date',new Date().toISOString().slice(0,10)).order('event_start_date').limit(3),
  ]) : [{data:null,error:true},{data:null,error:true},{data:null,error:true}];
  const notices = (noticeResult.data ?? []) as HomePost[];
  const boardPosts = (boardResult.data ?? []) as HomePost[];
  const schedules = (tournamentResult.data ?? []) as HomeTournament[];
  const date = (value: string) => new Date(value).toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit' });
  return (
    <>
      <section
        className="mainVisual"
        style={{ backgroundImage: "url('/images/gunsan-table-tennis-hero.webp')" }}
      >
        <div className="visualShade" />
        <div className="siteShell visualContent">
          <div className="heroCopy">
            <h1>군산시 탁구 동호인의<br />기록과 소식을 한곳에서</h1>
            <p>함께하는 탁구, 더 건강한 군산</p>
          </div>
        </div>
      </section>

      <section className="siteShell featureTiles" aria-label="주요 서비스">
        <Link
          href="/league"
          className="featureTile featureImageTile"
          style={{ backgroundImage: "url('/images/feature-league.webp')" }}
          aria-label="동호인리그 최근 결과 바로가기"
        />
        <Link
          href="/schedule"
          className="featureTile featureImageTile"
          style={{ backgroundImage: "url('/images/feature-schedule.webp')" }}
          aria-label="다가오는 대회 일정 바로가기"
        />
        <Link
          href="/notice"
          className="featureTile featureImageTile"
          style={{ backgroundImage: "url('/images/feature-notice.webp')" }}
          aria-label="협회 공지 바로가기"
        />
      </section>

      <section className="siteShell portalGrid">
        <div className="portalSection noticeSection">
          <div className="portalHeading">
            <h2>공지사항</h2>
            <Link href="/notice">+ 더보기</Link>
          </div>
          <div className="noticeRows">
            {notices.length === 0 && <p>{noticeResult.error ? '공지사항을 불러오지 못했습니다.' : '등록된 공지사항이 없습니다.'}</p>}
            {notices.map((post, index) => (
              <Link href={'/notice/' + post.id} className="noticeRow" key={post.id}>
                <span className={index === 0 ? 'noticeBadge important' : 'noticeBullet'}>{index === 0 ? '최신' : '›'}</span>
                <strong>{post.title}</strong><time>{date(post.created_at)}</time>
              </Link>
            ))}
          </div>
        </div>

        <div className="portalSection scheduleSection">
          <div className="portalHeading">
            <h2>대회일정</h2>
            <Link href="/schedule">+ 더보기</Link>
          </div>
          <div className="homeScheduleTable homeScheduleCompact">
            <div className="homeScheduleHead"><span>날짜</span><span>대회명</span><span>비고</span></div>
            {schedules.length === 0 && <p>{tournamentResult.error ? '대회일정을 불러오지 못했습니다.' : '예정된 대회가 없습니다.'}</p>}
            {schedules.map((event) => (
              <Link href={'/schedule/' + event.id} className="homeScheduleRow" key={event.id}>
                <span>{date(event.event_start_date)}</span><strong>{event.title}</strong><b>{event.status}</b>
              </Link>
            ))}
          </div>
        </div>

        <div className="portalSection boardSection">
          <div className="portalHeading">
            <h2>게시판</h2>
            <Link href="/board">+ 더보기</Link>
          </div>
          <div className="boardRows">
            {boardPosts.length === 0 && <p>{boardResult.error ? '게시글을 불러오지 못했습니다.' : '등록된 게시글이 없습니다.'}</p>}
            {boardPosts.map((post) => (
              <Link href={'/board/' + post.id} className="boardRow" key={post.id}>
                <span className="boardCategory">자유</span><strong>{post.title}</strong>
                <span className="boardAuthor">{post.author_name}</span><time>{date(post.created_at)}</time>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
