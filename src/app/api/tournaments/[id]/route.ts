import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/adminSession';
import { createAdminServerSupabase, createPublicServerSupabase } from '@/lib/supabase/server';
import type { Tournament, TournamentFile, TournamentFileKind } from '@/lib/tournaments';

type FileRow = {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  file_kind: TournamentFileKind;
  storage_path: string;
  sort_order: number;
};

type TournamentRow = {
  id: string;
  title: string;
  event_start_date: string;
  event_end_date: string | null;
  registration_start_date: string | null;
  registration_end_date: string | null;
  venue: string;
  status: Tournament['status'];
  source_url: string | null;
  visibility: Tournament['visibility'];
  created_at: string;
  updated_at: string;
  tournament_files?: FileRow[] | null;
};

function normalize(row: TournamentRow, baseUrl: string): Tournament {
  const files: TournamentFile[] = (row.tournament_files ?? []).sort((a, b) => a.sort_order - b.sort_order).map((file) => ({
    id: file.id,
    fileName: file.file_name,
    fileType: file.file_type,
    mimeType: file.mime_type,
    fileKind: file.file_kind,
    storagePath: file.storage_path,
    publicUrl: baseUrl + '/storage/v1/object/public/tournament-files/' + file.storage_path.split('/').map(encodeURIComponent).join('/'),
    sortOrder: file.sort_order,
  }));

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
    files,
  };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createPublicServerSupabase();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase || !baseUrl) return NextResponse.json({ error: '대회정보 저장소가 연결되지 않았습니다.' }, { status: 503 });

  const admin = request.nextUrl.searchParams.get('include_private') === '1' ? await hasAdminSession() : false;
  let query = supabase.from('tournaments').select('*, tournament_files(*)').eq('id', id);
  if (!admin) query = query.eq('visibility', 'public');

  const { data, error } = await query.single();
  if (error || !data) return NextResponse.json({ error: '대회정보를 찾을 수 없습니다.' }, { status: 404 });

  return NextResponse.json({ item: normalize(data as TournamentRow, baseUrl) });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await hasAdminSession()) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });

  const supabase = createAdminServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.' }, { status: 503 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as {
    title?: string;
    eventStartDate?: string;
    eventEndDate?: string;
    registrationStartDate?: string;
    registrationEndDate?: string;
    venue?: string;
    status?: Tournament['status'];
    sourceUrl?: string;
    visibility?: Tournament['visibility'];
  } | null;

  if (!body?.title?.trim() || !body.eventStartDate || !body.venue?.trim() || !body.status) {
    return NextResponse.json({ error: '필수 항목을 확인해주세요.' }, { status: 400 });
  }

  const { error } = await supabase.from('tournaments').update({
    title: body.title.trim(),
    event_start_date: body.eventStartDate,
    event_end_date: body.eventEndDate || null,
    registration_start_date: body.registrationStartDate || null,
    registration_end_date: body.registrationEndDate || null,
    venue: body.venue.trim(),
    status: body.status,
    source_url: body.sourceUrl?.trim() || null,
    visibility: body.visibility === 'private' ? 'private' : 'public',
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await hasAdminSession()) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });

  const supabase = createAdminServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.' }, { status: 503 });

  const { id } = await context.params;
  const { data: files } = await supabase.from('tournament_files').select('storage_path').eq('tournament_id', id);
  const paths = (files ?? []).map((file) => String(file.storage_path)).filter(Boolean);
  if (paths.length > 0) await supabase.storage.from('tournament-files').remove(paths);

  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
