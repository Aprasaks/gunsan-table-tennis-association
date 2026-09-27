const matches = [
  ['09.14', '군산 A팀', '3 : 2', '익산 B팀', '종료'],
  ['09.21', '군산 B팀', '-', '전주 A팀', '예정'],
  ['10.05', '군산 A팀', '-', '김제 A팀', '예정'],
];

const benefits = [
  ['공식 리그 경험', '대한탁구협회 시스템을 통해 신청하고 경기하는 생활탁구 공식 리그입니다.'],
  ['내 부수에 맞는 경기', 'T4부터 T7까지 부수별로 나뉘어 실력대가 비슷한 선수들과 겨룹니다.'],
  ['전북 본선 도전', '좋은 성적을 내면 군산을 넘어 전라북도 본선리그까지 이어집니다.'],
  ['참가 동기 확실', '경기 경험, 기념품, 시상품까지 있어 첫 참가자도 목표를 잡기 좋습니다.'],
];

const guideItems = [
  ['접수 마감', '2026년 6월 3일 수요일 24:00'],
  ['경기 장소', '티엘탁구클럽'],
  ['참가비', '1인 1종목 20,000원'],
  ['문의', '010-8447-0106'],
];

const divisionSchedule = [
  ['T4 남자', '6월 6일', '토'],
  ['T4 여자', '6월 7일', '일'],
  ['T5 남자', '6월 14일', '일'],
  ['T5 여자', '6월 27일', '토'],
  ['T6 남자', '6월 28일', '일'],
  ['T6 여자', '7월 4일', '토'],
  ['T7 남자', '7월 5일', '일'],
  ['T7 여자', '7월 25일', '토'],
];

export default function DivisionPage() {
  return (
    <>
      <section className="divisionHero">
        <div className="siteShell divisionHeroInner">
          <span className="crumb">HOME / 디비전리그</span>
          <div className="divisionHeroGrid">
            <div>
              <span className="divisionLabel">2026 군산시 디비전리그</span>
              <h1>군산에서 시작하는 공식 생활탁구 리그</h1>
              <p>
                내 부수에 맞춰 정식으로 경기하고, 좋은 성적을 내면 전북 본선리그까지
                도전할 수 있습니다.
              </p>
            </div>
            <div className="divisionHeroPanel" aria-label="디비전리그 핵심 안내">
              <strong>참가 전 꼭 확인하세요</strong>
              <span>마이페이지에서 지역, 부수, 부수승인 요청 후 접수 가능</span>
              <b>접수 마감 2026.06.03</b>
            </div>
          </div>
          <div className="divisionBadges" aria-label="디비전리그 특징">
            <span>공식 리그</span>
            <span>부수별 경기</span>
            <span>전북 본선 도전</span>
            <span>생활탁구 성장</span>
          </div>
        </div>
      </section>

      <section className="siteShell pageContent divisionPage">
        <section className="divisionIntro">
          <div className="divisionIntroText">
            <span>디비전리그란?</span>
            <h2>어려운 대회가 아니라, 내 실력에 맞춰 참가하는 생활탁구 공식 리그입니다.</h2>
            <p>
              디비전리그는 동호인이 부수별로 정식 경기를 치르는 승강제 생활체육 리그입니다.
              군산 시군구 리그에서 시작해 성적에 따라 더 큰 무대로 이어질 수 있습니다.
            </p>
          </div>
          <div className="divisionRoute">
            <span>군산 리그</span>
            <i aria-hidden="true" />
            <span>전북 본선</span>
            <i aria-hidden="true" />
            <span>상위 대회</span>
          </div>
        </section>

        <section className="divisionBenefitGrid" aria-label="디비전리그 참가 장점">
          {benefits.map(([title, text], index) => (
            <article className="divisionBenefitCard" key={title}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="divisionGuide">
          <div className="sectionBar"><h2>2026 군산시 대회 안내</h2><span>요강 핵심 정리</span></div>
          <div className="divisionGuideGrid">
            {guideItems.map(([label, value]) => (
              <div className="divisionGuideItem" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="divisionNoticeBox">
            <strong>접수 및 입금 후 문자 필수</strong>
            <p>유니폼 사이즈, 참가팀, 소속, 이름을 010-5606-5039로 보내주세요.</p>
          </div>
        </section>

        <section className="divisionScheduleSection">
          <div className="sectionBar"><h2>부수별 경기 일정</h2><span>T4 ~ T7</span></div>
          <div className="divisionScheduleGrid">
            {divisionSchedule.map(([division, date, day]) => (
              <div className="divisionScheduleItem" key={division}>
                <span>{division}</span>
                <strong>{date}</strong>
                <em>{day}</em>
              </div>
            ))}
          </div>
        </section>

        <div className="sectionBar"><h2>2026 디비전리그 경기 현황</h2><span>최근 업데이트 기준</span></div>
        <table className="dataTable">
          <thead><tr><th>날짜</th><th>홈</th><th>결과</th><th>원정</th><th>상태</th></tr></thead>
          <tbody>{matches.map(([date,home,score,away,status]) => (
            <tr key={date+home}>
              <td>{date}</td>
              <td>{home}</td>
              <td>{score}</td>
              <td>{away}</td>
              <td><span className={status === '종료' ? 'matchStatus done' : 'matchStatus'}>{status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
