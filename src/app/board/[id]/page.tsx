'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin, type MvpUser } from '@/lib/mvpAuth';
import type { BoardPost } from '@/lib/mvpBoard';

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BoardPost | null | undefined>(undefined);
  const [user, setUser] = useState<MvpUser | null>(null);

  useEffect(() => {
    fetch('/api/mvp/posts/' + params.id, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      setPost(response.ok ? result.post : null);
    }).catch(() => setPost(null));
    setUser(getCurrentUser());
  }, [params.id]);

  async function removePost() {
    if (!post || !user) return;
    const canDelete = post.authorId === user.id || isAdmin(user);
    if (!canDelete) return;
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;

    const response = await fetch('/api/mvp/posts/' + post.id, { method: 'DELETE' });
    if (!response.ok) {
      alert('게시글을 삭제할 권한이 없습니다.');
      return;
    }

    alert('게시글이 삭제되었습니다.');
    router.push('/board');
  }

  if (post === undefined) return <div className="siteShell pageContent">게시글을 불러오고 있습니다.</div>;

  if (!post) {
    return <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME &gt; 게시판</span><h1>게시판</h1><p>요청하신 게시글을 찾을 수 없습니다.</p></div></section>
      <div className="siteShell pageContent boardDetailWrap"><Link href="/board" className="boardListButton">목록으로</Link></div>
    </>;
  }

  const isOwner = Boolean(user && user.id === post.authorId);
  const canDelete = Boolean(user && (isOwner || isAdmin(user)));

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 게시판 &gt; 상세</span>
        <h1>게시판</h1>
        <p>군산시 탁구 동호인들이 자유롭게 의견과 정보를 나누는 공간입니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent boardDetailWrap">
      <article className="boardDetail">
        <header className="boardDetailHeader">
          <h2>{post.title}</h2>
          <div className="boardDetailMeta">
            <span><strong>작성자</strong> {post.authorName}</span>
            <span><strong>등록일</strong> {post.date}</span>
            {post.updatedAt && <span><strong>수정됨</strong></span>}
          </div>
        </header>

        <div className="boardDetailBody" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        {post.attachments.length > 0 && (
          <div className="boardAttachments">
            <strong>첨부파일</strong>
            <ul>
              {post.attachments.map((file) => (
                <li key={file.id}><a href={file.dataUrl} download={file.name}>{file.name}</a></li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <div className="boardDetailActions">
        <Link href="/board" className="boardListButton">목록으로</Link>
        {isOwner && <Link href={'/board/' + post.id + '/edit'} className="boardEditButton">수정</Link>}
        {canDelete && <button type="button" className="boardDeleteButton" onClick={removePost}>삭제</button>}
      </div>
    </div>
  </>;
}
