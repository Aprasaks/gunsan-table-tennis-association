import Link from 'next/link';
import { hasAdminSession } from '@/lib/adminSession';
import { createAdminServerSupabase, createPublicServerSupabase } from '@/lib/supabase/server';
import { formatShortDateRange, type Tournament, type TournamentStatus, type TournamentVisibility } from '@/lib/tournaments';
import { staticTournaments } from '@/lib/staticTournaments';

type TournamentRow = {
  id: string;
  title: string;
  event_start_date: string;
  event_end_date: string | null;
  registration_start_date: string | null;
  registration_end_date: string | null;
  venue: string;
  status: TournamentStatus;
  source_url: string | null;
  visibility: TournamentVisibility;
  created_at: string;
  updated_at: string;
};

export const dynamic = 'force-dynamic';

function normalize(row: TournamentRow): Tournament {
  return {
    id: row.id,
    title: row.title,
    eventStartDate: row.event_start_date,
    eventEndDate: row.event_end_date,
    registrationStartDate: row.registration_start_date,
    registrationEndDate: row.registration_end_date,
    venue: row.venue,
    status: row.status,
    sourceUrl: row.source_url,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files: [],
  };
}

export default async function SchedulePage() {
  const admin = await hasAdminSession();
  const supabase = admin ? createAdminServerSupabase() : createPublicServerSupabase();
  let items: Tournament[] = [...staticTournaments];

  if (supabase) {
    let query = supabase
      .from('tournaments')
      .select('id,title,event_start_date,event_end_date,registration_start_date,registration_end_date,venue,status,source_url,visibility,created_at,updated_at')
      .order('event_start_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (!admin) query = query.eq('visibility', 'public');

    const { data, error } = await query;
    if (!error && data) {
      const databaseItems = (data as TournamentRow[]).map(normalize);
      const sourceUrls = new Set(staticTournaments.map((item) => item.sourceUrl).filter(Boolean));
      items = [...staticTournaments, ...databaseItems.filter((item) => !item.sourceUrl || !sourceUrls.has(item.sourceUrl))]
        .sort((a, b) => a.eventStartDate.localeCompare(b.eventStartDate));
    }
  }

  return <>
    <section className="subHero">
      <div className="siteShell subHeroInner">
        <span className="crumb">HOME &gt; 대회일정</span>
        <h1>대회일정</h1>
        <p>군산시탁구협회와 전북특별자치도 주요 탁구대회 일정을 안내합니다.</p>
      </div>
    </section>

    <div className="siteShell pageContent">
      {admin && (
        <div className="contentAdminToolbar">
          <Link href="/admin/schedule/new" className="contentAdminButton">대회정보 직접 등록</Link>
        </div>
      )}

      <div className="scheduleTableWrap">
        <table className="scheduleTable">
          <thead>
            <tr>
              <th>대회날짜</th>
              <th>대회명</th>
              <th>접수날짜</th>
              <th>대회장소</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="scheduleEmpty">등록된 대회일정이 없습니다.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td className="scheduleDate">{formatShortDateRange(item.eventStartDate, item.eventEndDate)}</td>
                <td className="scheduleTitle">
                  <Link href={'/schedule/' + item.id}>{item.title}</Link>
                  {admin && item.visibility === 'private' && <span className="schedulePrivate">비공개</span>}
                </td>
                <td>{formatShortDateRange(item.registrationStartDate, item.registrationEndDate)}</td>
                <td>{item.venue}</td>
                <td><span className={'scheduleStatus scheduleStatus-' + item.status}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}
