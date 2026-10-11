'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshCurrentUser } from '@/lib/mvpAuth';
import type { BoardPost } from '@/lib/mvpBoard';

const PAGE_SIZE = 15;

type BoardListResponse = {
  posts: BoardPost[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
};

export default function BoardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch('/api/mvp/posts?kind=board&page=' + page + '&q=' + encodeURIComponent(search), {
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json() as BoardListResponse;
      if (!response.ok) throw new Error(result.message ?? '게시글을 불러오지 못했습니다.');
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > lastPage) { setPage(lastPage); return; }
      setPosts(result.posts);
      setTotal(result.total);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setPosts([]);
      setTotal(0);
      setError(cause instanceof Error ? cause.message : '게시글을 불러오지 못했습니다.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [page, search]);

  async function write() {
    if (writing) return;
    setWriting(true);
    try {
      const user = await refreshCurrentUser();
      router.push(user ? '/board/write' : '/login');
    } catch {
      setError('로그인 정보를 확인하지 못했습니다. 다시 시도해주세요.');
      setWriting(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index);

  return (
    <div className="siteShell pageContent boardPage">
      <div className="boardPageHeading">
        <div>
          <h1>게시판</h1>
          <p>회원들과 탁구 소식과 이야기를 나누는 공간입니다.</p>
        </div>
        <button type="button" className="boardWriteButton" onClick={write} disabled={writing}>
          {writing ? '확인 중…' : '글쓰기'}
        </button>
      </div>

      <div className="boardListTools">
        <p className="boardTotal" aria-live="polite">
          {loading ? '게시글 확인 중…' : error ? '목록을 불러오지 못했습니다.' : search ? '검색 결과 ' + total + '건' : '전체 ' + total + '건'}
        </p>
        <form className="boardSearch" onSubmit={submitSearch} role="search">
          <label htmlFor="board-search">제목 검색</label>
          <input id="board-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={80} placeholder="검색어를 입력하세요" />
          <button type="submit">검색</button>
          {search && <button type="button" className="boardSearchReset" onClick={clearSearch}>초기화</button>}
        </form>
      </div>

      {error && <div className="boardError" role="alert">{error}<button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>전체 목록 보기</button></div>}

      <table className="boardListTable">
        <thead>
          <tr>
            <th scope="col" className="boardNumber">번호</th>
            <th scope="col">제목</th>
            <th scope="col" className="boardAuthorColumn">작성자</th>
            <th scope="col" className="boardDateColumn">작성일</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} className="boardEmpty" role="status">게시글을 불러오는 중입니다.</td></tr>
          ) : error ? (
            <tr><td colSpan={4} className="boardEmpty">목록을 표시할 수 없습니다.</td></tr>
          ) : posts.length === 0 ? (
            <tr><td colSpan={4} className="boardEmpty">{search ? '검색 결과가 없습니다.' : '아직 등록된 게시글이 없습니다.'}</td></tr>
          ) : posts.map((post, index) => (
            <tr key={post.id}>
              <td className="boardNumber">{total - (page - 1) * PAGE_SIZE - index}</td>
              <td className="boardTitleCell"><Link href={'/board/' + post.id}>{post.title}</Link></td>
              <td className="boardAuthorCell">{post.authorName}</td>
              <td className="boardDateCell"><time dateTime={post.createdAt.slice(0, 10)}>{post.date}</time></td>
            </tr>
          ))}
        </tbody>
      </table>

      {!error && !loading && totalPages > 1 && (
        <nav className="boardPagination" aria-label="게시판 페이지">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>이전</button>
          {pageNumbers.map((number) => (
            <button key={number} type="button" onClick={() => setPage(number)} aria-current={page === number ? 'page' : undefined}>{number}</button>
          ))}
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>다음</button>
        </nav>
      )}
    </div>
  );
}
