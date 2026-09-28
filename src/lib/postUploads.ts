export const POST_FILE_BUCKET = 'post-files';
export const MAX_POST_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_INLINE_IMAGES = 12;
export const MAX_ATTACHMENTS = 8;

export type PostFileRole = 'inline' | 'attachment';

export type UploadDescriptor = {
  id: string;
  role: PostFileRole;
  name: string;
  type: string;
  size: number;
  stagingPath?: string;
};

export type PostAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  dataUrl?: string;
};

export type StoredPostFile = {
  id: string;
  post_id: string;
  file_kind: 'inline' | 'attachment';
  storage_path: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf',
  hwp: 'application/x-hwp', hwpx: 'application/vnd.hancom.hwpx',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip', txt: 'text/plain',
};

export const POST_FILE_ACCEPT = Object.keys(MIME_BY_EXTENSION).map((extension) => `.${extension}`).join(',');
export const POST_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp';

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function fileExtension(name: string) {
  return name.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}

export function sourceMime(name: string) {
  return MIME_BY_EXTENSION[fileExtension(name)] ?? null;
}

export function isImageName(name: string) {
  return sourceMime(name)?.startsWith('image/') ?? false;
}

export function stagingPath(postId: string, fileId: string) {
  return `staging/${postId}/${fileId}`;
}

export function postFileUrl(postId: string, fileId: string) {
  return `/api/mvp/files/${postId}/${fileId}`;
}

export function postAttachment(file: StoredPostFile): PostAttachment {
  return {
    id: file.id,
    name: file.stored_name,
    type: file.mime_type,
    size: Number(file.size) || 0,
    url: postFileUrl(file.post_id, file.id),
  };
}

export function validateUploadDescriptor(value: unknown): UploadDescriptor | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const name = String(input.name ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180);
  const role = input.role === 'inline' || input.role === 'attachment' ? input.role : null;
  const size = Number(input.size);
  const mime = sourceMime(name);
  if (!isUuid(input.id) || !role || !name || !mime || !Number.isSafeInteger(size) || size <= 0 || size > MAX_POST_FILE_BYTES) return null;
  if (role === 'inline' && !mime.startsWith('image/')) return null;
  return { id: input.id, role, name, type: mime, size };
}

export function uploadError(file: Pick<File, 'name' | 'size'>, role: PostFileRole) {
  if (file.size > MAX_POST_FILE_BYTES) return `${file.name}: 파일은 10MB 이하만 올릴 수 있습니다.`;
  if (file.size <= 0) return `${file.name}: 비어 있는 파일은 올릴 수 없습니다.`;
  const mime = sourceMime(file.name);
  if (!mime || (role === 'inline' && !mime.startsWith('image/'))) {
    return role === 'inline'
      ? '본문 이미지는 JPG, PNG, GIF, WebP 파일만 사용할 수 있습니다.'
      : `${file.name}: 지원하지 않는 파일 형식입니다.`;
  }
  return null;
}
