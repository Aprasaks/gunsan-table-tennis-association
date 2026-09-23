import { load } from 'cheerio';
import { actor } from '@/lib/mvpServer';

export type PostKind = 'notice' | 'board';
export function postView(row: Record<string, any>) {
  return { id: row.id, title: row.title, contentHtml: row.content_html,
    visibility: row.visibility, authorId: row.author_key, authorName: row.author_name,
    attachments: row.attachments ?? [], date: new Date(row.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\s/g, ''),
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
      node.attr('href', attrs.href); node.attr('rel', 'noopener noreferrer');
    }
    if (tag === 'img' && /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(attrs.src ?? '') && attrs.src.length < 2_800_000) {
      node.attr('src', attrs.src); node.attr('alt', (attrs.alt ?? '').slice(0, 100));
    } else if (tag === 'img') node.remove();
    if (tag === 'font' && /^#[0-9a-f]{6}$/i.test(attrs.color ?? '')) node.attr('color', attrs.color);
  });
  return $.html();
}

export function validPostInput(body: any) {
  const title = String(body?.title ?? '').trim().slice(0, 180);
  const rawHtml = String(body?.contentHtml ?? '');
  if (!title || !rawHtml || rawHtml.length > 3_000_000) return null;
  const contentHtml = sanitizeHtml(rawHtml);
  if (!load(contentHtml).text().trim() && !contentHtml.includes('<img')) return null;
  const files = body?.attachments;
  if (!Array.isArray(files) || files.length > 8 || JSON.stringify(body).length > 3_800_000 ||
      files.some((file: any) => typeof file?.name !== 'string' || file.name.length > 180 ||
        typeof file?.dataUrl !== 'string' || !/^data:(image\/(png|jpeg|gif|webp)|application\/(pdf|octet-stream|x-hwp|haansofthwp|zip|vnd\.[a-z0-9.+-]+));base64,[a-z0-9+/=]+$/i.test(file.dataUrl))) return null;
  return { title, content_html: contentHtml, attachments: files.map((file: any) => ({
    id: String(file.id ?? '').slice(0, 100), name: file.name, type: String(file.type ?? '').slice(0, 100),
    size: Number(file.size) || 0, dataUrl: file.dataUrl,
  })) };
}

export function authorKey(current: NonNullable<Awaited<ReturnType<typeof actor>>>) {
  return current.admin ? 'admin-root' : current.user.id;
}
export function authorName(current: NonNullable<Awaited<ReturnType<typeof actor>>>) {
  return current.admin ? '관리자' : current.user.name;
}
