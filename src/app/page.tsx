import Link from 'next/link';

const notices = [
  ['중요', '2026년 군산시탁구협회장배 생활체육 탁구대회 개최 안내', '09.11'],
  ['', '군산시 동호인리그 3차전 경기결과 및 전적 안내', '09.10'],
  ['', '2026년 하반기 클럽 회원등록 안내 (신규·갱신)', '09.06'],
  ['', '제13회 군산새만금배 전국오픈탁구대회 참가요강 공지', '09.02'],
  ['', '2026년 군산시탁구협회 임시총회 개최 안내', '08.28'],
];

const schedules = [
  ['09.19 (토)', '2026년 군산시탁구협회장배 생활체육 탁구대회', '군산월명체육관', '접수중'],
  ['10.17 (토)', '제13회 군산새만금배 전국오픈탁구대회', '군산월명체육관', '예정'],
  ['11.07 (토)', '군산시 동호인리그 결선', '군산월명체육관', '예정'],
];

const boardPosts = [
  ['자유', '탁구장 정보 공유드립니다.', '홍길동', '09.11'],
  ['문의', '동호인리그 참가 관련 문의', '김철수', '09.10'],
  ['클럽', '신규 회원 모집 안내', '월명클럽', '09.09'],
  ['후기', '협회장배 대회 참가 후기', '이영수', '09.08'],
  ['장비', '라켓 및 러버 정보 공유', '박민수', '09.07'],
];

export default function Home() {
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
            {notices.map(([type, title, date], index) => (
              <Link href="/notice" className="noticeRow" key={title}>
                <span className={index === 0 ? 'noticeBadge important' : 'noticeBullet'}>{type || '›'}</span>
                <strong>{title}</strong>
                <time>{date}</time>
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
            {schedules.map(([date,title,,status]) => (
              <Link href="/schedule" className="homeScheduleRow" key={title}>
                <span>{date}</span><strong>{title}</strong><b>{status}</b>
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
            {boardPosts.map(([category, title, author, date]) => (
              <Link href="/board" className="boardRow" key={`${category}-${title}`}>
                <span className="boardCategory">{category}</span>
                <strong>{title}</strong>
                <span className="boardAuthor">{author}</span>
                <time>{date}</time>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
