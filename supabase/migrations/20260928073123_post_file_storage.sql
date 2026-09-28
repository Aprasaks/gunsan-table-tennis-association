-- Keep post bodies small and store uploaded binaries in a private bucket.
create table if not exists public.mvp_post_files (
  id uuid primary key,
  post_id uuid not null references public.mvp_posts(id) on delete cascade,
  file_kind text not null check (file_kind in ('inline', 'attachment')),
  storage_path text not null unique,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  size bigint not null check (size >= 0),
  created_at timestamptz not null default now()
);

create index if not exists mvp_post_files_post_idx
  on public.mvp_post_files(post_id, created_at);

alter table public.mvp_post_files enable row level security;
revoke all on table public.mvp_post_files from public, anon, authenticated;
grant all on table public.mvp_post_files to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-files',
  'post-files',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/x-hwp', 'application/haansofthwp',
    'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed',
    'text/plain', 'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
