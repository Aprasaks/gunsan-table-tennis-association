import Link from 'next/link';
import { notFound } from 'next/navigation';
import { actor, db } from '@/lib/mvpServer';
import { postView } from '@/lib/mvpPostsServer';
export const dynamic = 'force-dynamic';

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let row;
  try {
    const result = await db().from('mvp_posts').select('*').eq('id', id).eq('kind', 'notice').single();
    row = result.data;
    if (!row) notFound();
    if (row.visibility === 'private') {
      const current = await actor();
      if (!(current?.admin || current?.user?.associationTitle)) notFound();
    }
  } catch { notFound(); }
  const notice = postView(row);
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME &gt; 공지사항 &gt; 상세</span><h1>공지사항</h1><p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p></div></section>
    <div className="siteShell pageContent noticeDetailWrap"><article className="noticeDetail">
      <header className="noticeDetailHeader"><h2>{notice.title}{notice.visibility === 'private' && <span className="noticePrivateBadge noticePrivateBadgeDetail">비공개</span>}</h2><div className="noticeDetailMeta"><span>등록일</span><time>{notice.date}</time></div></header>
      <div className="noticeDetailBody noticeRichBody" dangerouslySetInnerHTML={{ __html: notice.contentHtml }} />
      {notice.attachments.length > 0 && <div className="noticeAttachments"><strong>첨부파일</strong><ul>{notice.attachments.map((file: {id: string; dataUrl: string; name: string}) => <li key={file.id}><a href={file.dataUrl} download={file.name}>{file.name}</a></li>)}</ul></div>}
    </article><div className="noticeDetailActions"><Link href="/notice" className="noticeListButton">목록으로</Link></div></div>
  </>;
}
