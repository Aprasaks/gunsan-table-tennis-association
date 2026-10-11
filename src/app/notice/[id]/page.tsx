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
  const [current, result] = await Promise.all([
    actor().catch((cause) => { logServerError('[notice/detail] actor failed', cause); return null; }),
    db().from('mvp_posts').select('*').eq('id', id).eq('kind', 'notice').maybeSingle(),
  ]);
  if (result.error) {
    logServerError('[notice/detail] failed to load notice', result.error);
    notFound();
  }
  const row = result.data;
  if (!row) notFound();
  if (row.visibility === 'private' && !(current?.admin || isAssociationOfficer(current?.user))) notFound();

  const files = await postFiles(id).catch((cause) => {
    logServerError('[notice/detail] failed to load files', cause);
    return [];
  });
  const notice = postView(row, files);
  const canEdit = isAssociationOfficer(current?.user);

  return (
    <div className="siteShell pageContent noticeDetailWrap">
      <article className="noticeDetail">
        <header className="noticeDetailHeader">
          <h1>{notice.title}{notice.visibility === 'private' && <span className="noticePrivateBadge noticePrivateBadgeDetail">비공개</span>}</h1>
          <div className="noticeDetailMeta">
            <span><strong>등록일</strong> <time dateTime={notice.createdAt.slice(0, 10)}>{notice.date}</time></span>
            {notice.updatedAt && new Date(notice.updatedAt).getTime() > new Date(notice.createdAt).getTime() + 1000 && <span>수정된 글</span>}
          </div>
        </header>
        <RichContentViewer html={notice.contentHtml} className="noticeDetailBody noticeRichBody" />
        {notice.attachments.length > 0 && (
          <div className="noticeAttachments">
            <strong>첨부파일</strong>
            <ul>{notice.attachments.map((file) => (
              <li key={file.id}><a href={file.url || file.dataUrl} download={file.name}>{file.name}</a></li>
            ))}</ul>
          </div>
        )}
      </article>
      <NoticeActions noticeId={notice.id} canEdit={canEdit} canDelete={canEdit} />
    </div>
  );
}
