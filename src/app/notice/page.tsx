const rows = [
  ['15','협회공지','2026년 4분기 회원 등록 안내','2026.09.11'],
  ['14','동호인리그','2026 동호인리그 9월 경기 결과 등록 안내','2026.09.10'],
  ['13','대회안내','군산시 생활체육 탁구대회 참가 안내','2026.09.06'],
  ['12','협회공지','클럽 대표자 및 총무 정보 확인 요청','2026.09.02'],
  ['11','일반공지','홈페이지 이용 및 회원정보 등록 안내','2026.08.28'],
  ['10','협회공지','2026년 하반기 협회 운영 일정 안내','2026.08.20'],
];
export default function NoticePage(){return <><section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME &gt; 공지사항</span><h1>공지사항</h1><p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p></div></section><div className="siteShell pageContent"><table className="dataTable noticeTable"><thead><tr><th className="num">번호</th><th className="category">구분</th><th>제목</th><th className="date">등록일</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]}><td className="num">{r[0]}</td><td className="category">{r[1]}</td><td>{r[2]}</td><td className="date">{r[3]}</td></tr>)}</tbody></table></div></>}
