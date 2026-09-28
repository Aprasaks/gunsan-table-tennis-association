'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  MAX_ATTACHMENTS,
  MAX_INLINE_IMAGES,
  POST_FILE_ACCEPT,
  POST_FILE_BUCKET,
  POST_IMAGE_ACCEPT,
  sourceMime,
  uploadError,
  type PostAttachment,
  type PostFileRole,
  type UploadDescriptor,
} from '@/lib/postUploads';
import type { NoticeVisibility } from '@/lib/mvpContent';
import styles from './admin/editor.module.css';

type PendingUpload = UploadDescriptor & { file: File; previewUrl?: string };

type Props = {
  kind: 'notice' | 'board';
  postId: string;
  authorName?: string;
  initialTitle?: string;
  initialContentHtml?: string;
  initialAttachments?: PostAttachment[];
  initialVisibility?: NoticeVisibility;
  method?: 'POST' | 'PATCH';
  endpoint: string;
  successHref: string;
  cancelHref: string;
  submitLabel: string;
  placeholder: string;
};

function sanitizeEditorHtml(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('script,style,iframe,object,embed,form,svg,math,template').forEach((node) => node.remove());
  container.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if (name === 'href' && !/^(https?:\/\/|mailto:)/i.test(attribute.value.trim())) node.removeAttribute(attribute.name);
    });
  });
  return container.innerHTML;
}

function descriptor(file: File, role: PostFileRole): PendingUpload {
  return {
    id: crypto.randomUUID(),
    role,
    name: file.name,
    type: sourceMime(file.name) ?? file.type ?? 'application/octet-stream',
    size: file.size,
    file,
  };
}

async function optimizeImageFile(file: File) {
  if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) { bitmap.close(); return file; }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp', lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export default function PostEditor({
  kind,
  postId,
  authorName,
  initialTitle = '',
  initialContentHtml = '',
  initialAttachments = [],
  initialVisibility = 'public',
  method = 'POST',
  endpoint,
  successHref,
  cancelHref,
  submitLabel,
  placeholder,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingUpload[]>([]);
  const [title, setTitle] = useState(initialTitle);
  const [visibility, setVisibility] = useState<NoticeVisibility>(initialVisibility);
  const [attachments, setAttachments] = useState<PostAttachment[]>(initialAttachments);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyStatus, setBusyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialContentHtml;
  }, [initialContentHtml]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => () => {
    pendingRef.current.forEach((file) => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    });
  }, []);

  useEffect(() => {
    if (!busyStatus) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [busyStatus]);

  function rememberSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    editorRef.current?.focus();
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return;
    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      savedRangeRef.current = null;
    }
  }

  function command(name: string, value?: string) {
    restoreSelection();
    document.execCommand(name, false, value);
    rememberSelection();
  }

  function addLink() {
    rememberSelection();
    const raw = window.prompt('추가할 링크 주소를 입력해주세요.');
    if (!raw?.trim()) return;
    const url = /^https?:\/\//i.test(raw.trim()) || /^mailto:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    restoreSelection();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) document.execCommand('createLink', false, url);
    else {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = url;
      document.execCommand('insertHTML', false, anchor.outerHTML);
    }
    rememberSelection();
  }

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    const error = files.map((file) => uploadError(file, 'inline')).find(Boolean);
    const currentCount = editorRef.current?.querySelectorAll('img').length ?? 0;
    if (error) { setMessage(error); return; }
    if (currentCount + files.length > MAX_INLINE_IMAGES) { setMessage('본문 이미지는 12개까지 넣을 수 있습니다.'); return; }

    setBusyStatus('이미지 크기를 줄이고 있습니다…');
    try {
      const optimized = await Promise.all(files.map(optimizeImageFile));
      const added = optimized.map((file) => ({ ...descriptor(file, 'inline'), previewUrl: URL.createObjectURL(file) }));
      setPending((current) => [...current, ...added]);
      restoreSelection();
      for (const item of added) {
        const image = document.createElement('img');
        image.src = item.previewUrl;
        image.alt = item.name;
        image.dataset.uploadId = item.id;
        document.execCommand('insertHTML', false, image.outerHTML);
      }
      rememberSelection();
      setMessage('');
    } finally {
      setBusyStatus(null);
    }
  }

  async function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    const error = files.map((file) => uploadError(file, 'attachment')).find(Boolean);
    const pendingAttachments = pending.filter((file) => file.role === 'attachment').length;
    if (error) { setMessage(error); return; }
    if (attachments.length + pendingAttachments + files.length > MAX_ATTACHMENTS) { setMessage('첨부파일은 8개까지 올릴 수 있습니다.'); return; }
    const containsImage = files.some((file) => /\.(jpe?g|png|webp)$/i.test(file.name));
    if (containsImage) setBusyStatus('첨부 이미지를 최적화하고 있습니다…');
    try {
      const optimized = await Promise.all(files.map(optimizeImageFile));
      setPending((current) => [...current, ...optimized.map((file) => descriptor(file, 'attachment'))]);
      setMessage('');
    } finally {
      setBusyStatus(null);
    }
  }

  function removePending(id: string) {
    setPending((current) => {
      const target = current.find((file) => file.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((file) => file.id !== id);
    });
  }

  async function uploadFiles(files: PendingUpload[]) {
    if (!files.length) return;
    const response = await fetch('/api/mvp/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, postId, files: files.map(({ file: _file, previewUrl: _previewUrl, ...item }) => item) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? '파일 업로드를 준비하지 못했습니다.');
    await Promise.all(result.uploads.map(async (upload: { id: string; path: string; token: string; contentType: string }) => {
      const item = files.find((file) => file.id === upload.id);
      if (!item) throw new Error('업로드할 파일을 찾지 못했습니다.');
      const { error } = await supabase.storage.from(POST_FILE_BUCKET).uploadToSignedUrl(upload.path, upload.token, item.file, {
        contentType: upload.contentType,
        upsert: true,
      });
      if (error) throw error;
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const editor = editorRef.current;
    const html = editor ? sanitizeEditorHtml(editor.innerHTML) : '';
    const hasBody = Boolean(editor?.textContent?.trim()) || Boolean(editor?.querySelector('img'));
    if (!title.trim() || !hasBody) { setMessage('제목과 본문을 모두 입력해주세요.'); return; }

    const activeInlineIds = new Set(Array.from(editor?.querySelectorAll<HTMLImageElement>('img[data-upload-id]') ?? []).map((image) => image.dataset.uploadId));
    const activePending = pending.filter((file) => file.role === 'attachment' || activeInlineIds.has(file.id));
    setSubmitting(true);
    setBusyStatus(activePending.length ? '파일을 업로드하고 있습니다…' : '게시글을 저장하고 있습니다…');
    try {
      await uploadFiles(activePending);
      setBusyStatus(activePending.length ? '이미지를 변환해 저장하고 있습니다…' : '게시글을 저장하고 있습니다…');
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          title: title.trim(),
          contentHtml: html,
          visibility,
          existingAttachmentIds: attachments.map((file) => file.id),
          newFiles: activePending.map(({ file: _file, previewUrl: _previewUrl, ...item }) => item),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? '게시글을 저장하지 못했습니다.');
      router.push(successHref);
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '게시글을 저장하지 못했습니다.');
      setSubmitting(false);
      setBusyStatus(null);
    }
  }

  const pendingAttachments = pending.filter((file) => file.role === 'attachment');

  return (
    <form className={styles.wrap} onSubmit={submit}>
      {message && <p className={styles.message} aria-live="polite">{message}</p>}
      {authorName && <div className={styles.row}><label>작성자</label><input value={authorName} readOnly /></div>}
      <div className={styles.row}>
        <label htmlFor="post-title">제목</label>
        <input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === 'notice' ? '공지사항 제목' : '게시글 제목'} maxLength={180} />
      </div>
      <div className={styles.row}>
        <label>본문</label>
        <div className={styles.editorBox}>
          <div className={styles.toolbar} aria-label="본문 편집 도구">
            <button type="button" onMouseDown={(event) => { event.preventDefault(); command('bold'); }} aria-label="굵게"><strong>B</strong></button>
            <button type="button" onMouseDown={(event) => { event.preventDefault(); command('italic'); }} aria-label="기울임"><em>I</em></button>
            <select aria-label="글자 크기" defaultValue="3" onMouseDown={rememberSelection} onChange={(event) => command('fontSize', event.target.value)}>
              <option value="2">작게</option><option value="3">보통</option><option value="4">크게</option><option value="5">매우 크게</option>
            </select>
            <label className={styles.colorControl}><span>글자색</span><input type="color" defaultValue="#222222" onMouseDown={rememberSelection} onChange={(event) => command('foreColor', event.target.value)} /></label>
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={Boolean(busyStatus)}>이미지</button>
            <button type="button" onClick={addLink}>링크</button>
          </div>
          <div ref={editorRef} className={styles.editor} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onMouseUp={rememberSelection} onKeyUp={rememberSelection} onInput={rememberSelection} />
          <input ref={imageInputRef} className={styles.hiddenInput} type="file" accept={POST_IMAGE_ACCEPT} multiple onChange={addImages} />
        </div>
      </div>
      <div className={styles.row}>
        <label>첨부파일</label>
        <div className={styles.fileActions}>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(busyStatus)}>파일 추가</button>
          <span>파일당 10MB, 최대 8개 · 첨부한 JPG·PNG·GIF·WebP도 WebP로 자동 변환됩니다.</span>
        </div>
        <input ref={fileInputRef} className={styles.hiddenInput} type="file" accept={POST_FILE_ACCEPT} multiple onChange={addAttachments} />
        {(attachments.length > 0 || pendingAttachments.length > 0) && <ul className={styles.fileList}>
          {attachments.map((file) => <li key={file.id}><span>{file.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}>삭제</button></li>)}
          {pendingAttachments.map((file) => <li key={file.id}><span>{file.name} <small>(새 파일)</small></span><button type="button" onClick={() => removePending(file.id)}>삭제</button></li>)}
        </ul>}
      </div>
      {kind === 'notice' && <div className={styles.row}><label htmlFor="visibility">공개 설정</label><select id="visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as NoticeVisibility)}><option value="public">공개</option><option value="private">비공개</option></select></div>}
      <div className={styles.actions}>
        <Link href={cancelHref} className={styles.cancel}>취소</Link>
        <button type="submit" className={styles.submit} disabled={submitting}>{submitting ? '처리 중…' : submitLabel}</button>
      </div>
      {busyStatus ? <div className={styles.savingOverlay} role="dialog" aria-modal="true" aria-labelledby="saving-title">
        <div className={styles.savingModal}>
          <span className={styles.spinner} aria-hidden="true" />
          <strong id="saving-title">{busyStatus}</strong>
          <p>잠시만 기다려주세요. 완료되면 자동으로 이동합니다.</p>
        </div>
      </div> : null}
    </form>
  );
}
