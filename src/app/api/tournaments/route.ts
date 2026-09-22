import { randomUUID } from 'node:crypto';
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

function fileToPublic(row: FileRow, baseUrl: string): TournamentFile {
  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    mimeType: row.mime_type,
    fileKind: row.file_kind,
    storagePath: row.storage_path,
    publicUrl: baseUrl + '/storage/v1/object/public/tournament-files/' + row.storage_path.split('/').map(encodeURIComponent).join('/'),
    sortOrder: row.sort_order,
  };
}

function normalizeTournament(row: TournamentRow, baseUrl: string): Tournament {
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
    files: (row.tournament_files ?? []).sort((a, b) => a.sort_order - b.sort_order).map((file) => fileToPublic(file, baseUrl)),
  };
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function nullable(value: string) {
  return value ? value : null;
}

function safeFileName(name: string) {
  return name.replace(/[^0-9A-Za-z가-힣._-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'file';
}

function fileEntries(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
}

export async function GET(request: NextRequest) {
  const supabase = createPublicServerSupabase();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase || !baseUrl) {
    return NextResponse.json({ error: '대회정보 저장소가 연결되지 않았습니다.' }, { status: 503 });
  }

  const wantsPrivate = request.nextUrl.searchParams.get('include_private') === '1';
  const admin = wantsPrivate ? await hasAdminSession() : false;

  let query = supabase
    .from('tournaments')
    .select('*, tournament_files(*)')
    .order('event_start_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (!admin) query = query.eq('visibility', 'public');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as TournamentRow[];
  return NextResponse.json({ items: rows.map((row) => normalizeTournament(row, baseUrl)) });
}

export async function POST(request: NextRequest) {
  if (!await hasAdminSession()) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
  }

  const supabase = createAdminServerSupabase();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabase || !baseUrl) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.' }, { status: 503 });
  }

  const formData = await request.formData();
  const title = textValue(formData, 'title');
  const eventStartDate = textValue(formData, 'eventStartDate');
  const eventEndDate = textValue(formData, 'eventEndDate');
  const registrationStartDate = textValue(formData, 'registrationStartDate');
  const registrationEndDate = textValue(formData, 'registrationEndDate');
  const venue = textValue(formData, 'venue');
  const status = textValue(formData, 'status');
  const sourceUrl = textValue(formData, 'sourceUrl');
  const visibility = textValue(formData, 'visibility');

  if (!title || !eventStartDate || !venue || !['예정', '접수중', '마감', '종료'].includes(status)) {
    return NextResponse.json({ error: '대회명, 대회날짜, 장소, 상태를 확인해주세요.' }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('tournaments')
    .insert({
      title,
      event_start_date: eventStartDate,
      event_end_date: nullable(eventEndDate),
      registration_start_date: nullable(registrationStartDate),
      registration_end_date: nullable(registrationEndDate),
      venue,
      status,
      source_url: nullable(sourceUrl),
      visibility: visibility === 'private' ? 'private' : 'public',
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    return NextResponse.json({ error: insertError?.message ?? '대회정보를 저장하지 못했습니다.' }, { status: 500 });
  }

  const tournamentId = String(inserted.id);
  const uploadedPaths: string[] = [];
  const fileRows: Array<{
    tournament_id: string;
    file_name: string;
    file_type: string;
    mime_type: string | null;
    file_kind: TournamentFileKind;
    storage_path: string;
    sort_order: number;
  }> = [];

  async function upload(files: File[], kind: TournamentFileKind, startOrder: number) {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const path = tournamentId + '/' + kind + '/' + randomUUID() + '-' + safeFileName(file.name);
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error } = await supabase.storage.from('tournament-files').upload(path, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploadedPaths.push(path);
      fileRows.push({
        tournament_id: tournamentId,
        file_name: file.name,
        file_type: file.name.split('.').pop()?.toLowerCase() ?? 'file',
        mime_type: file.type || null,
        file_kind: kind,
        storage_path: path,
        sort_order: startOrder + index,
      });
    }
  }

  try {
    const images = fileEntries(formData, 'guidelineImages');
    const attachments = fileEntries(formData, 'attachments');
    await upload(images, 'guideline_image', 0);
    await upload(attachments, 'attachment', 100);

    if (fileRows.length > 0) {
      const { error } = await supabase.from('tournament_files').insert(fileRows);
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    if (uploadedPaths.length > 0) await supabase.storage.from('tournament-files').remove(uploadedPaths);
    await supabase.from('tournaments').delete().eq('id', tournamentId);
    return NextResponse.json({ error: error instanceof Error ? error.message : '첨부파일을 저장하지 못했습니다.' }, { status: 500 });
  }

  const { data, error } = await supabase.from('tournaments').select('*, tournament_files(*)').eq('id', tournamentId).single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? '저장된 대회를 불러오지 못했습니다.' }, { status: 500 });

  return NextResponse.json({ item: normalizeTournament(data as TournamentRow, baseUrl) }, { status: 201 });
}
