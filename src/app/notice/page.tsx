import Link from 'next/link';
import { actor, db, logServerError } from '@/lib/mvpServer';
import { isAssociationOfficer } from '@/lib/mvpAuth';
import { postView } from '@/lib/mvpPostsServer';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 15;
type Params = { q?: string | string[]; page?: string | string[] };
type Props = { searchParams: Promise<Params> };

function listHref(page: number, search: string) {
  const query = new URLSearchParams();
  if (search) query.set('q', search);
  if (page > 1) query.set('page', String(page));
  const value = query.toString();
  return '/notice' + (value ? '?' + value : '');
}

export default async function NoticePage({ searchParams }: Props) {
  const params = await searchParams;
  const search = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 80);
  const rawPage = typeof params.page === 'string' ? params.page : '1';
  const page = /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;

  let notices: ReturnType<typeof postView>[] = [];
  let total = 0;
  let error = '';
  let canWrite = false;
  try {
    const current = await actor();
    canWrite = isAssociationOfficer(current?.user);
    const canSeePrivate = Boolean(current?.admin || isAssociationOfficer(current?.user));
    let query = db().from('mvp_posts').select('*', { count: 'exact' })
      .eq('kind', 'notice')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (!canSeePrivate) query = query.eq('visibility', 'public');
    if (search) query = query.ilike('title', '%' + search.replace(/[\\%_]/g, '\\$&') + '%');
    const { data, count, error: dbError } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (dbError) throw dbError;
    notices = (data ?? []).map((row) => postView(row));
    total = count ?? 0;
  } catch (cause) {
    logServerError('[notice/page] failed to load notices', cause);
    error = '공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index);

  return (
    <div className="siteShell pageContent noticeListPage">
      <div className="noticeListHeading">
        <h1>공지사항</h1>
        {canWrite && <Link href="/admin/notice/new" className="boardWriteButton noticeWriteButton">공지사항 작성</Link>}
      </div>

      <div className="boardListTools">
        <p className="boardTotal" aria-live="polite">
          {error ? '목록을 불러오지 못했습니다.' : search ? '검색 결과 ' + total + '건' : '전체 ' + total + '건'}
        </p>
        <form action="/notice" method="get" className="boardSearch" role="search">
          <label htmlFor="notice-search">제목 검색</label>
          <input id="notice-search" type="search" name="q" defaultValue={search} maxLength={80} placeholder="검색어를 입력하세요" />
          <button type="submit">검색</button>
          {search && <Link href="/notice" className="noticeSearchReset">초기화</Link>}
        </form>
      </div>

      {error && <p className="boardError" role="alert">{error}</p>}

      <table className="boardListTable noticeListTable">
        <thead><tr>
          <th scope="col" className="boardNumber">번호</th>
          <th scope="col">제목</th>
          <th scope="col" className="boardAuthorColumn">작성자</th>
          <th scope="col" className="boardDateColumn">등록일</th>
        </tr></thead>
        <tbody>
          {notices.length === 0 && (
            <tr><td colSpan={4} className="boardEmpty">
              {error ? '목록을 표시할 수 없습니다.' : search ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}
            </td></tr>
          )}
          {notices.map((notice, index) => (
            <tr key={notice.id}>
              <td className="boardNumber">{total - (page - 1) * PAGE_SIZE - index}</td>
              <td className="boardTitleCell">
                <Link href={'/notice/' + notice.id}>{notice.title}</Link>
                {notice.visibility === 'private' && <span className="noticePrivateBadge">비공개</span>}
              </td>
              <td className="boardAuthorCell">{notice.authorName}</td>
              <td className="boardDateCell"><time dateTime={notice.createdAt.slice(0, 10)}>{notice.date}</time></td>
            </tr>
          ))}
        </tbody>
      </table>

      {!error && totalPages > 1 && (
        <nav className="boardPagination noticePagination" aria-label="공지사항 페이지">
          {page > 1 ? <Link href={listHref(page - 1, search)}>이전</Link> : <span aria-disabled="true">이전</span>}
          {pageNumbers.map((number) => (
            <Link key={number} href={listHref(number, search)} aria-current={page === number ? 'page' : undefined}>{number}</Link>
          ))}
          {page < totalPages ? <Link href={listHref(page + 1, search)}>다음</Link> : <span aria-disabled="true">다음</span>}
        </nav>
      )}
    </div>
  );
}
