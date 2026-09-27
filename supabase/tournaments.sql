-- 대회일정: 실제 운영 데이터
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_start_date date not null,
  event_end_date date,
  registration_start_date date,
  registration_end_date date,
  venue text not null,
  status text not null default '예정' check (status in ('예정','접수중','마감','종료')),
  source_url text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tournament_files (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  mime_type text,
  file_kind text not null check (file_kind in ('guideline_image','attachment')),
  storage_path text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tournament_files_tournament_idx on tournament_files(tournament_id);

alter table tournaments enable row level security;
alter table tournament_files enable row level security;

drop policy if exists "public tournament read" on tournaments;
create policy "public tournament read" on tournaments
  for select to anon, authenticated
  using (visibility = 'public');

drop policy if exists "public tournament file read" on tournament_files;
create policy "public tournament file read" on tournament_files
  for select to anon, authenticated
  using (
    exists (
      select 1 from tournaments
      where tournaments.id = tournament_files.tournament_id
        and tournaments.visibility = 'public'
    )
  );

insert into storage.buckets (id, name, public)
values ('tournament-files', 'tournament-files', true)
on conflict (id) do update set public = true;
