import { load } from 'cheerio';
import { actor } from '@/lib/mvpServer';
import { postAttachment, type StoredPostFile } from '@/lib/postUploads';

export type PostKind = 'notice' | 'board';
export function postView(row: Record<string, any>, files: StoredPostFile[] = []) {
  const storedAttachments = files.filter((file) => file.file_kind === 'attachment').map(postAttachment);
  const legacyAttachments = Array.isArray(row.attachments) ? row.attachments.map((file: Record<string, unknown>) => ({
    id: String(file.id ?? ''),
    name: String(file.name ?? '첨부파일'),
    type: String(file.type ?? 'application/octet-stream'),
    size: Number(file.size) || 0,
    url: String(file.dataUrl ?? ''),
    dataUrl: String(file.dataUrl ?? ''),
  })).filter((file: { url: string }) => file.url.startsWith('data:')) : [];
  return { id: row.id, title: row.title, contentHtml: row.content_html,
    visibility: row.visibility, authorId: row.author_key, authorName: row.author_name,
    attachments: [...storedAttachments, ...legacyAttachments], date: new Date(row.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\s/g, ''),
    createdAt: row.created_at, updatedAt: row.updated_at };
}

export function sanitizeHtml(html: string) {
  const $ = load(html, null, false);
  const allowed = new Set(['p','div','br','strong','b','em','i','u','span','font','h2','h3','ul','ol','li','blockquote','a','img']);
  $('script,style,iframe,object,embed,form,svg,math,template').remove();
  $('*').each((_, element) => {
    const node = $(element);
    const tag = element.type === 'tag' ? element.tagName.toLowerCase() : '';
    if (!allowed.has(tag)) { node.replaceWith(node.contents()); return; }
    const attrs = { ...(element as unknown as { attribs: Record<string, string> }).attribs };
    for (const key of Object.keys(attrs)) node.removeAttr(key);
    if (tag === 'a' && /^(https?:\/\/|mailto:)/i.test(attrs.href ?? '')) {
      node.attr('href', attrs.href); node.attr('target', '_blank'); node.attr('rel', 'noopener noreferrer');
    }
    const storedImage = /^\/api\/mvp\/files\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(attrs.src ?? '');
    if (tag === 'img' && storedImage) {
      node.attr('src', attrs.src); node.attr('alt', (attrs.alt ?? '').slice(0, 100));
    } else if (tag === 'img') node.remove();
    if (tag === 'font' && /^#[0-9a-f]{6}$/i.test(attrs.color ?? '')) node.attr('color', attrs.color);
  });
  return $.html();
}

export function validPostInput(body: any) {
  const title = String(body?.title ?? '').trim().slice(0, 180);
  const rawHtml = String(body?.contentHtml ?? '');
  if (!title || !rawHtml || rawHtml.length > 500_000) return null;
  const contentHtml = sanitizeHtml(rawHtml);
  if (!load(contentHtml).text().trim() && !contentHtml.includes('<img')) return null;
  return { title, content_html: contentHtml, attachments: [] };
}

export function authorKey(current: NonNullable<Awaited<ReturnType<typeof actor>>>) {
  return current.admin ? 'admin-root' : current.user.id;
}
export function authorName(current: NonNullable<Awaited<ReturnType<typeof actor>>>) {
  return current.admin ? '관리자' : current.user.name;
}
