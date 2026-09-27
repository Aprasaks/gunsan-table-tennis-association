import Link from 'next/link';
import { actor, db } from '@/lib/mvpServer';
import { postView } from '@/lib/mvpPostsServer';
export const dynamic = 'force-dynamic';

export default async function NoticePage() {
  let rows: ReturnType<typeof postView>[] = [];
  let error = '';
  let canWrite = false;
  try {
    const current = await actor();
    canWrite = Boolean(current && !current.admin && current.user.associationTitle);
    const canSeePrivate = Boolean(current?.admin || current?.user?.associationTitle);
    let query = db().from('mvp_posts').select('*').eq('kind', 'notice').order('created_at', { ascending: false });
    if (!canSeePrivate) query = query.eq('visibility', 'public');
    const result = await query;
    if (result.error) throw result.error;
    rows = (result.data ?? []).map(postView);
  } catch { error = '공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'; }
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME &gt; 공지사항</span><h1>공지사항</h1><p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p></div></section>
    <div className="siteShell pageContent">
      {canWrite && <div className="contentAdminToolbar"><Link href="/admin/notice/new" className="contentAdminButton">공지사항 작성</Link></div>}
      {error && <p role="alert">{error}</p>}
      <table className="dataTable noticeTable"><thead><tr><th className="num">번호</th><th>제목</th><th className="date">등록일</th></tr></thead><tbody>
        {rows.length === 0 && !error && <tr><td colSpan={3}>등록된 공지사항이 없습니다.</td></tr>}
        {rows.map((row, index) => <tr key={row.id}><td className="num">{rows.length - index}</td><td><Link href={'/notice/' + row.id} className="noticeTitleLink">{row.title}{row.visibility === 'private' && <span className="noticePrivateBadge">비공개</span>}</Link></td><td className="date">{row.date}</td></tr>)}
      </tbody></table>
    </div>
  </>;
}
