'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/mvpAuth';
import type { BoardPost } from '@/lib/mvpBoard';

export default function BoardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/mvp/posts?kind=board', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setPosts(result.posts);
    }).catch((cause) => setError(cause.message));
  }, []);

  function write() {
    if (!getCurrentUser()) {
      router.push('/login');
      return;
    }
    router.push('/board/write');
  }

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 게시판</span>
        <h1>게시판</h1>
        <p>군산시 탁구 동호인들이 자유롭게 의견과 정보를 나누는 공간입니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      <div className="boardToolbar boardToolbarLarge">
        <button type="button" onClick={write}>글쓰기</button>
      </div>

      {error && <p role="alert">{error}</p>}
      <table className="dataTable boardTable">
        <thead>
          <tr>
            <th className="boardNumber">번호</th>
            <th>제목</th>
            <th className="boardAuthorColumn">작성자</th>
            <th className="boardDateColumn">등록일</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr><td colSpan={4} className="boardEmpty">등록된 게시글이 없습니다.</td></tr>
          ) : posts.map((post, index) => (
            <tr key={post.id}>
              <td>{posts.length - index}</td>
              <td className="boardTitleCell"><Link href={'/board/' + post.id}>{post.title}</Link></td>
              <td className="boardAuthorCell">{post.authorName}</td>
              <td>{post.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>;
}
