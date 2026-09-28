import sharp from 'sharp';
import { load } from 'cheerio';
import { db } from '@/lib/mvpServer';
import {
  isImageName,
  isUuid,
  MAX_ATTACHMENTS,
  MAX_INLINE_IMAGES,
  POST_FILE_BUCKET,
  postFileUrl,
  sourceMime,
  stagingPath,
  type StoredPostFile,
  type UploadDescriptor,
  validateUploadDescriptor,
} from '@/lib/postUploads';

export class PostFileInputError extends Error {}

export function parseUploadDescriptors(value: unknown, postId: string) {
  if (!Array.isArray(value)) throw new PostFileInputError('업로드 파일 정보를 확인해주세요.');
  const files = value.map(validateUploadDescriptor);
  if (files.some((file) => !file)) throw new PostFileInputError('지원하지 않는 파일이 포함되어 있습니다.');
  const valid = files as UploadDescriptor[];
  if (new Set(valid.map((file) => file.id)).size !== valid.length) throw new PostFileInputError('중복된 파일이 포함되어 있습니다.');
  if (valid.filter((file) => file.role === 'inline').length > MAX_INLINE_IMAGES || valid.filter((file) => file.role === 'attachment').length > MAX_ATTACHMENTS) {
    throw new PostFileInputError('본문 이미지는 12개, 첨부파일은 8개까지 올릴 수 있습니다.');
  }
  return valid.map((file) => ({ ...file, stagingPath: stagingPath(postId, file.id) }));
}

function cleanFileName(name: string) {
  return name.trim().replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 180) || 'file';
}

function convertedName(name: string) {
  return cleanFileName(name).replace(/\.[^.]+$/, '') + '.webp';
}

async function convertImage(buffer: Buffer, fileName: string) {
  return sharp(buffer, { animated: /\.gif$/i.test(fileName), limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 2 })
    .toBuffer();
}

export async function postFiles(postId: string) {
  const { data, error } = await db().from('mvp_post_files').select('*').eq('post_id', postId).order('created_at');
  if (error) throw error;
  return (data ?? []) as StoredPostFile[];
}

export async function createUploadTokens(postId: string, files: UploadDescriptor[]) {
  const storage = db().storage.from(POST_FILE_BUCKET);
  return Promise.all(files.map(async (file) => {
    const path = stagingPath(postId, file.id);
    const { data, error } = await storage.createSignedUploadUrl(path, { upsert: true });
    if (error || !data?.token) throw error ?? new Error('업로드 주소를 만들지 못했습니다.');
    return { id: file.id, path, token: data.token, contentType: sourceMime(file.name) };
  }));
}

export async function materializeUploads(postId: string, files: UploadDescriptor[]) {
  const storage = db().storage.from(POST_FILE_BUCKET);
  const rows: StoredPostFile[] = [];
  const uploadedPaths: string[] = [];
  const stagedPaths = files.map((file) => stagingPath(postId, file.id));

  try {
    async function materialize(file: UploadDescriptor) {
      const stagedPath = stagingPath(postId, file.id);
      const { data: blob, error: downloadError } = await storage.download(stagedPath);
      if (downloadError || !blob) throw new PostFileInputError(`${file.name} 업로드를 확인하지 못했습니다.`);
      const source = Buffer.from(await blob.arrayBuffer());
      if (!source.length || source.length > 10 * 1024 * 1024) throw new PostFileInputError(`${file.name} 용량을 확인해주세요.`);
      const image = isImageName(file.name);
      const output = image ? await convertImage(source, file.name) : source;
      const extension = image ? 'webp' : file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
      if (!extension) throw new PostFileInputError(`${file.name} 형식을 확인해주세요.`);
      const finalPath = `posts/${postId}/${file.id}.${extension}`;
      const mimeType = image ? 'image/webp' : (sourceMime(file.name) ?? 'application/octet-stream');
      const storedName = image ? convertedName(file.name) : cleanFileName(file.name);
      const { error: uploadError } = await storage.upload(finalPath, output, { contentType: mimeType, cacheControl: '31536000', upsert: false });
      if (uploadError) throw uploadError;
      return {
        path: finalPath,
        row: {
          id: file.id,
          post_id: postId,
          file_kind: file.role,
          storage_path: finalPath,
          original_name: cleanFileName(file.name),
          stored_name: storedName,
          mime_type: mimeType,
          size: output.length,
        } satisfies StoredPostFile,
      };
    }

    for (let index = 0; index < files.length; index += 3) {
      const results = await Promise.allSettled(files.slice(index, index + 3).map(materialize));
      for (const result of results) {
        if (result.status === 'fulfilled') {
          uploadedPaths.push(result.value.path);
          rows.push(result.value.row);
        }
      }
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    }
    if (stagedPaths.length) await storage.remove(stagedPaths);
    return { rows, uploadedPaths };
  } catch (error) {
    if (uploadedPaths.length) await storage.remove(uploadedPaths);
    if (stagedPaths.length) await storage.remove(stagedPaths);
    if (error instanceof PostFileInputError) throw error;
    throw new PostFileInputError('파일 처리 중 오류가 발생했습니다. 이미지 파일이 손상되지 않았는지 확인해주세요.');
  }
}

export function normalizePostHtml(
  rawHtml: string,
  postId: string,
  newFiles: StoredPostFile[],
  existingInlineIds: Set<string>,
) {
  const $ = load(rawHtml, null, false);
  const newInline = newFiles.filter((file) => file.file_kind === 'inline');
  for (const file of newInline) {
    const images = $(`img[data-upload-id="${file.id}"]`);
    if (images.length !== 1) throw new PostFileInputError(`${file.original_name} 이미지 위치를 확인해주세요.`);
    images.attr('src', postFileUrl(postId, file.id)).removeAttr('data-upload-id');
  }
  $('img').each((_, element) => {
    const image = $(element);
    const match = (image.attr('src') ?? '').match(/^\/api\/mvp\/files\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/i);
    if (!match) return;
    const [, sourcePostId, fileId] = match;
    const isNew = newInline.some((file) => file.id === fileId);
    if (sourcePostId !== postId || (!isNew && !existingInlineIds.has(fileId))) image.remove();
  });
  $('[data-upload-id]').removeAttr('data-upload-id');
  return $.html();
}

export function referencedInlineFileIds(html: string, postId: string) {
  const ids = new Set<string>();
  const $ = load(html, null, false);
  $('img').each((_, element) => {
    const match = ($(element).attr('src') ?? '').match(/^\/api\/mvp\/files\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/i);
    if (match?.[1] === postId && isUuid(match[2])) ids.add(match[2]);
  });
  return ids;
}

export async function removeStoredFiles(files: Array<Pick<StoredPostFile, 'storage_path'>>) {
  const paths = files.map((file) => file.storage_path);
  if (!paths.length) return;
  const { error } = await db().storage.from(POST_FILE_BUCKET).remove(paths);
  if (error) throw error;
}
