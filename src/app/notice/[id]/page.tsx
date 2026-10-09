import { notFound } from 'next/navigation';
import { actor, db, logServerError } from '@/lib/mvpServer';
import { postView } from '@/lib/mvpPostsServer';
import { isAssociationOfficer } from '@/lib/mvpAuth';
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
      if (!(current?.admin || isAssociationOfficer(current?.user))) notFound();
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
  const canEdit = isAssociationOfficer(current?.user);
  const canDelete = canEdit;
  return <>
    <div className="siteShell pageContent noticeDetailWrap"><article className="noticeDetail">
      <header className="noticeDetailHeader"><h1>{notice.title}{notice.visibility === 'private' && <span className="noticePrivateBadge noticePrivateBadgeDetail">비공개</span>}</h1><div className="noticeDetailMeta"><span>등록일</span><time>{notice.date}</time>{notice.updatedAt ? <span>수정됨</span> : null}</div></header>
      <RichContentViewer html={notice.contentHtml} className="noticeDetailBody noticeRichBody" />
      {notice.attachments.length > 0 && <div className="noticeAttachments"><strong>첨부파일</strong><ul>{notice.attachments.map((file) => <li key={file.id}><a href={file.url || file.dataUrl} download={file.name}>{file.name}</a></li>)}</ul></div>}
    </article><NoticeActions noticeId={notice.id} canEdit={canEdit} canDelete={canDelete} /></div>
  </>;
}
