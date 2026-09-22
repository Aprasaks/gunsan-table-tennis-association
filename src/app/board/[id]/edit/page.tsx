'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser, type MvpUser } from '@/lib/mvpAuth';
import { getBoardPosts, updateBoardPost, type BoardAttachment, type BoardPost } from '@/lib/mvpBoard';
import styles from '../../../admin/editor.module.css';

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
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if (name === 'href') {
        const value = attribute.value.trim();
        if (!/^https?:\/\//i.test(value) && !/^mailto:/i.test(value)) node.removeAttribute(attribute.name);
      }
    });
  });
  return container.innerHTML;
}

export default function BoardEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<MvpUser | null>(null);
  const [post, setPost] = useState<BoardPost | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [attachments, setAttachments] = useState<BoardAttachment[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    const currentPost = getBoardPosts().find((item) => item.id === params.id);
    if (!currentPost) {
      setPost(null);
      return;
    }

    if (currentPost.authorId !== currentUser.id) {
      alert('작성자만 게시글을 수정할 수 있습니다.');
      router.replace('/board/' + params.id);
      return;
    }

    setUser(currentUser);
    setPost(currentPost);
    setTitle(currentPost.title);
    setAttachments(currentPost.attachments);

    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = currentPost.contentHtml;
    });
  }, [params.id, router]);

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
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function command(name: string, value?: string) {
    restoreSelection();
    document.execCommand(name, false, value);
    rememberSelection();
  }

  function addLink() {
    rememberSelection();
    const raw = window.prompt('추가할 링크 주소를 입력해주세요.');
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : 'https://' + raw.trim();
    restoreSelection();

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand('insertHTML', false, '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer">' + url + '</a>');
    }
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
    if (!user || !post) return;

    const editor = editorRef.current;
    const html = editor ? sanitizeEditorHtml(editor.innerHTML) : '';
    const hasBody = Boolean(editor?.textContent?.trim()) || Boolean(editor?.querySelector('img'));

    if (!title.trim() || !hasBody) {
      setMessage('제목과 본문을 모두 입력해주세요.');
      return;
    }

    const updated = updateBoardPost(post.id, user.id, {
      title: title.trim(),
      contentHtml: html,
      attachments,
    });

    if (!updated) {
      setMessage('게시글을 수정할 권한이 없습니다.');
      return;
    }

    alert('게시글이 수정되었습니다.');
    router.push('/board/' + post.id);
  }

  if (post === undefined) return <div className="siteShell pageContent">게시글을 불러오고 있습니다.</div>;
  if (!post || !user) return <div className="siteShell pageContent">게시글을 찾을 수 없습니다.</div>;

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME / 게시판 / 수정</span>
        <h1>게시글 수정</h1>
        <p>작성한 게시글의 제목, 본문, 이미지, 링크와 첨부파일을 수정합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      <form className={styles.wrap} onSubmit={submit}>
        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.row}>
          <label>작성자</label>
          <input value={post.authorName} readOnly />
        </div>

        <div className={styles.row}>
          <label htmlFor="title">제목</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className={styles.row}>
          <label>본문</label>
          <div className={styles.editorBox}>
            <div className={styles.toolbar} aria-label="본문 편집 도구">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); command('bold'); }} aria-label="굵게"><strong>B</strong></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); command('italic'); }} aria-label="기울임"><em>I</em></button>
              <select aria-label="글자 크기" defaultValue="3" onMouseDown={rememberSelection} onChange={(e) => command('fontSize', e.target.value)}>
                <option value="2">작게</option>
                <option value="3">보통</option>
                <option value="4">크게</option>
                <option value="5">매우 크게</option>
              </select>
              <label className={styles.colorControl}>
                <span>글자색</span>
                <input type="color" defaultValue="#222222" onMouseDown={rememberSelection} onChange={(e) => command('foreColor', e.target.value)} />
              </label>
              <button type="button" onClick={() => imageInputRef.current?.click()}>이미지</button>
              <button type="button" onClick={addLink}>링크</button>
            </div>

            <div
              ref={editorRef}
              className={styles.editor}
              contentEditable
              suppressContentEditableWarning
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
            <span>기존 첨부파일을 삭제하거나 새 파일을 추가할 수 있습니다.</span>
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

        <div className={styles.actions}>
          <Link href={'/board/' + post.id} className={styles.cancel}>취소</Link>
          <button type="submit" className={styles.submit}>수정 완료</button>
        </div>
      </form>
    </div>
  </>;
}
