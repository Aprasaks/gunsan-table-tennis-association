import { notFound } from 'next/navigation';
import { actor, db, logServerError } from '@/lib/mvpServer';
import { authorKey, postView } from '@/lib/mvpPostsServer';
import { postFiles } from '@/lib/postFilesServer';
import RichContentViewer from '@/app/RichContentViewer';
import NoticeActions from './NoticeActions';
export const dynamic = 'force-dynamic';

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let row;
  let current: Awaited<ReturnType<typeof actor>> = null;
  try {
    const [viewer, result] = await Promise.all([
      actor(),
      db().from('mvp_posts').select('*').eq('id', id).eq('kind', 'notice').single(),
    ]);
    current = viewer;
    row = result.data;
    if (!row) notFound();
    if (row.visibility === 'private') {
      if (!(current?.admin || current?.user?.associationTitle)) notFound();
    }
  } catch (cause) {
    logServerError('[notice/detail] failed to load notice', cause);
    notFound();
  }
  const files = await postFiles(id).catch((cause) => {
    logServerError('[notice/detail] failed to load files', cause);
    return [];
  });
  const notice = postView(row, files);
  const isOwner = Boolean(current && row.author_key === authorKey(current));
  const canEdit = Boolean(current && (current.admin || (isOwner && current.user?.associationTitle)));
  const canDelete = Boolean(current && (current.admin || isOwner));
  return <>
    <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME &gt; 공지사항 &gt; 상세</span><h1>공지사항</h1><p>군산시탁구협회의 주요 공지와 안내를 확인합니다.</p></div></section>
    <div className="siteShell pageContent noticeDetailWrap"><article className="noticeDetail">
      <header className="noticeDetailHeader"><h2>{notice.title}{notice.visibility === 'private' && <span className="noticePrivateBadge noticePrivateBadgeDetail">비공개</span>}</h2><div className="noticeDetailMeta"><span>등록일</span><time>{notice.date}</time>{notice.updatedAt ? <span>수정됨</span> : null}</div></header>
      <RichContentViewer html={notice.contentHtml} className="noticeDetailBody noticeRichBody" />
      {notice.attachments.length > 0 && <div className="noticeAttachments"><strong>첨부파일</strong><ul>{notice.attachments.map((file) => <li key={file.id}><a href={file.url || file.dataUrl} download={file.name}>{file.name}</a></li>)}</ul></div>}
    </article><NoticeActions noticeId={notice.id} canEdit={canEdit} canDelete={canDelete} /></div>
  </>;
}
