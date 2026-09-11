const matches = [
  ['09.14', '군산 A팀', '3 : 2', '익산 B팀', '종료'],
  ['09.21', '군산 B팀', '-', '전주 A팀', '예정'],
  ['10.05', '군산 A팀', '-', '김제 A팀', '예정'],
];

export default function DivisionPage() {
  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME / 디비전리그</span><h1>디비전리그</h1><p>군산 참가팀의 경기 일정과 결과를 확인합니다.</p></div></section>
      <section className="siteShell pageContent">
        <div className="sectionBar"><h2>2026 디비전리그 경기 현황</h2><span>최근 업데이트 기준</span></div>
        <table className="dataTable">
          <thead><tr><th>날짜</th><th>홈</th><th>결과</th><th>원정</th><th>상태</th></tr></thead>
          <tbody>{matches.map(([date,home,score,away,status]) => <tr key={date+home}><td>{date}</td><td>{home}</td><td>{score}</td><td>{away}</td><td>{status}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
