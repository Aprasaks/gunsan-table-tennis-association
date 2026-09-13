import Link from 'next/link';
import { notices } from './data';

export default function NoticePage(){
  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 공지사항</span>
        <h1>공지사항</h1>
        <p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p>
      </div>
    </section>
    <div className="siteShell pageContent">
      <table className="dataTable noticeTable">
        <thead>
          <tr>
            <th className="num">번호</th>
            <th>제목</th>
            <th className="date">등록일</th>
          </tr>
        </thead>
        <tbody>
          {notices.map((notice)=><tr key={notice.id}>
            <td className="num">
              <Link className="noticeCellLink" href={`/notice/${notice.id}`} aria-label={`${notice.title} 상세보기`}>
                {notice.id}
              </Link>
            </td>
            <td>
              <Link className="noticeCellLink noticeTitleLink" href={`/notice/${notice.id}`}>
                {notice.title}
              </Link>
            </td>
            <td className="date">
              <Link className="noticeCellLink" href={`/notice/${notice.id}`} aria-label={`${notice.title} 상세보기`}>
                {notice.date}
              </Link>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>
}
