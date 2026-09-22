'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/mvpAuth';
import { saveAdminNotice, type NoticeAttachment, type NoticeVisibility } from '@/lib/mvpContent';
import styles from '../../editor.module.css';

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function sanitizeEditorHtml(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('script,style,iframe,object,embed').forEach((node) => node.remove());
  container.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  return container.innerHTML;
}

export default function NewNoticePage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<NoticeVisibility>('public');
  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || !isAdmin(currentUser)) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  function rememberSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    editorRef.current?.focus();
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function command(name: string, value?: string) {
    restoreSelection();
    document.execCommand(name, false, value);
    rememberSelection();
  }

  async function addImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일만 본문에 추가할 수 있습니다.');
      return;
    }

    try {
      const dataUrl = await readFile(file);
      restoreSelection();
      document.execCommand('insertImage', false, dataUrl);
      rememberSelection();
      setMessage('');
    } catch {
      setMessage('이미지를 불러오지 못했습니다.');
    }
  }

  async function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    try {
      const added = await Promise.all(files.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: await readFile(file),
      })));
      setAttachments((current) => [...current, ...added]);
      setMessage('');
    } catch {
      setMessage('첨부파일을 불러오지 못했습니다.');
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((file) => file.id !== id));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const editor = editorRef.current;
    const html = editor ? sanitizeEditorHtml(editor.innerHTML) : '';
    const hasBody = Boolean(editor?.textContent?.trim()) || Boolean(editor?.querySelector('img'));

    if (!title.trim() || !hasBody) {
      setMessage('제목과 본문을 모두 입력해주세요.');
      return;
    }

    try {
      const item = saveAdminNotice({
        title: title.trim(),
        date: today(),
        content: [],
        contentHtml: html,
        visibility,
        attachments,
      });
      router.push(`/notice/${item.id}`);
    } catch {
      setMessage('저장하지 못했습니다. 이미지나 첨부파일 용량이 너무 큰 경우 파일 크기를 줄여주세요.');
    }
  }

  if (!ready) return <div className="siteShell pageContent">관리자 권한을 확인하고 있습니다.</div>;

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME / 관리자 / 공지사항 작성</span>
        <h1>공지사항 작성</h1>
        <p>협회 공식 공지를 작성합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      <form className={styles.wrap} onSubmit={submit}>
        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.row}>
          <label htmlFor="title">제목</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지사항 제목" />
        </div>

        <div className={styles.row}>
          <label>본문</label>
          <div className={styles.editorBox}>
            <div className={styles.toolbar} aria-label="본문 편집 도구">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); command('bold'); }} aria-label="굵게"><strong>B</strong></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); command('italic'); }} aria-label="기울임"><em>I</em></button>
              <select
                aria-label="글자 크기"
                defaultValue="3"
                onMouseDown={rememberSelection}
                onChange={(e) => command('fontSize', e.target.value)}
              >
                <option value="2">작게</option>
                <option value="3">보통</option>
                <option value="4">크게</option>
                <option value="5">매우 크게</option>
              </select>
              <label className={styles.colorControl}>
                <span>글자색</span>
                <input
                  type="color"
                  defaultValue="#222222"
                  onMouseDown={rememberSelection}
                  onChange={(e) => command('foreColor', e.target.value)}
                />
              </label>
              <button type="button" onClick={() => imageInputRef.current?.click()}>이미지</button>
            </div>

            <div
              ref={editorRef}
              className={styles.editor}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="공지 내용을 입력하세요."
              onMouseUp={rememberSelection}
              onKeyUp={rememberSelection}
              onInput={rememberSelection}
            />
            <input ref={imageInputRef} className={styles.hiddenInput} type="file" accept="image/*" onChange={addImage} />
          </div>
        </div>

        <div className={styles.row}>
          <label>첨부파일</label>
          <div className={styles.fileActions}>
            <button type="button" onClick={() => fileInputRef.current?.click()}>파일 추가</button>
            <span>PDF, HWP/HWPX, Excel, Word, 이미지 등 여러 파일을 첨부할 수 있습니다.</span>
          </div>
          <input ref={fileInputRef} className={styles.hiddenInput} type="file" multiple onChange={addAttachments} />
          {attachments.length > 0 && (
            <ul className={styles.fileList}>
              {attachments.map((file) => (
                <li key={file.id}>
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(file.id)}>삭제</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.row}>
          <label htmlFor="visibility">공개 설정</label>
          <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as NoticeVisibility)}>
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </div>

        <div className={styles.actions}>
          <Link href="/notice" className={styles.cancel}>취소</Link>
          <button type="submit" className={styles.submit}>공지 등록</button>
        </div>
      </form>
    </div>
  </>;
}
