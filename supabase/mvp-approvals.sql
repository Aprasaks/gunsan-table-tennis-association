-- Apply in the Supabase SQL editor before deploying the approval workflow.
-- The service role is the only API role permitted to read these tables.
create extension if not exists pgcrypto;

create table if not exists mvp_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date text not null,
  gender text not null check (gender in ('남', '여')),
  phone text not null unique,
  club text not null,
  rank text not null default '',
  position text not null default '일반',
  association_title text not null default '' check (association_title in ('', '협회장', '이사', '총무', '고문', '사무국장')),
  password_hash text not null,
  signature_data_url text,
  member_status text not null default 'active' check (member_status in ('active', 'withdrawn')),
  created_at timestamptz not null default now()
);

create table if not exists mvp_transfers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  member_id uuid not null references mvp_members(id),
  member_name text not null,
  gender text not null,
  rank text not null default '',
  phone text not null,
  from_club text not null,
  to_club text not null,
  source_chair_user_id uuid not null references mvp_members(id),
  source_chair_name text not null,
  source_chair_signature_data_url text not null,
  request_date date not null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending_destination' check (status in ('pending_destination','pending_admin','approved','rejected')),
  destination_approved_by uuid references mvp_members(id),
  destination_approved_at timestamptz,
  processed_by text,
  processed_at timestamptz,
  admin_note text not null default ''
);
alter table mvp_transfers add column if not exists legacy_id text unique;
alter table mvp_members drop constraint if exists mvp_members_association_title_check;
alter table mvp_members add constraint mvp_members_association_title_check
  check (association_title in ('', '협회장', '이사', '총무', '고문', '사무국장'));
create index if not exists mvp_transfers_status_idx on mvp_transfers(status, requested_at desc);

alter table mvp_members enable row level security;
alter table mvp_transfers enable row level security;
-- No anon/authenticated policies. Next.js validates the signed cookie and uses
-- the service role on the server; browser clients cannot query these records.

create or replace function process_mvp_transfer(
  p_id uuid, p_action text, p_actor text, p_note text default ''
) returns text language plpgsql security invoker as $$
declare v_row mvp_transfers%rowtype;
begin
  select * into v_row from mvp_transfers where id = p_id for update;
  if not found then return 'missing'; end if;
  if p_action = 'destination' then
    if v_row.status <> 'pending_destination' then return 'already_processed'; end if;
    update mvp_transfers set status = 'pending_admin',
      destination_approved_by = p_actor::uuid, destination_approved_at = now()
      where id = p_id;
    insert into mvp_alerts (kind, title, detail, target_url)
      values ('transfer', '이적 최종 승인 대기', v_row.member_name || ': ' || v_row.from_club || ' → ' || v_row.to_club, '/members/approvals');
  elsif p_action = 'approve' then
    if v_row.status <> 'pending_admin' then return 'already_processed'; end if;
    update mvp_members set club = v_row.to_club where id = v_row.member_id;
    update mvp_transfers set status = 'approved', processed_by = p_actor,
      processed_at = now(), admin_note = '' where id = p_id;
  elsif p_action = 'reject' then
    if v_row.status <> 'pending_admin' or trim(p_note) = '' then return 'invalid'; end if;
    update mvp_transfers set status = 'rejected', processed_by = p_actor,
      processed_at = now(), admin_note = trim(p_note) where id = p_id;
  else return 'invalid';
  end if;
  return 'ok';
end $$;
revoke all on function process_mvp_transfer(uuid,text,text,text) from public, anon, authenticated;
grant execute on function process_mvp_transfer(uuid,text,text,text) to service_role;
alter function process_mvp_transfer(uuid,text,text,text) set search_path = public, pg_temp;

-- Posts and registration drafts are accessed only by server routes after cookie checks.
create table if not exists mvp_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('notice', 'board')),
  title text not null,
  content_html text not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  author_key text not null,
  author_name text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists mvp_posts_kind_date_idx on mvp_posts(kind, created_at desc);
alter table mvp_posts enable row level security;

create table if not exists mvp_rosters (
  manager_id uuid primary key references mvp_members(id) on delete cascade,
  club text not null,
  draft jsonb not null,
  saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  submitted_snapshot jsonb
);
alter table mvp_rosters enable row level security;

create table if not exists mvp_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('hope_signup', 'hope_registration', 'transfer')),
  title text not null,
  detail text not null,
  target_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists mvp_alerts_date_idx on mvp_alerts(created_at desc);
alter table mvp_alerts enable row level security;

create table if not exists mvp_alert_reads (
  alert_id uuid not null references mvp_alerts(id) on delete cascade,
  recipient_key text not null,
  read_at timestamptz not null default now(),
  primary key (alert_id, recipient_key)
);
alter table mvp_alert_reads enable row level security;

create or replace function alert_hope_signup() returns trigger language plpgsql security invoker as $$
begin
  if new.rank like '%희망부' then
    insert into mvp_alerts(kind, title, detail, target_url)
      values ('hope_signup', '희망부 신규 가입', new.name || ' · ' || new.club || ' · ' || new.rank, '/admin/members');
  end if;
  return new;
end $$;
drop trigger if exists mvp_hope_signup on mvp_members;
create trigger mvp_hope_signup after insert on mvp_members for each row execute function alert_hope_signup();
alter function alert_hope_signup() set search_path = public, pg_temp;

create or replace function alert_hope_registration() returns trigger language plpgsql security invoker as $$
declare v_member jsonb; v_changed boolean;
begin
  if tg_op = 'INSERT' then v_changed := true;
  else v_changed := old.submitted_snapshot is distinct from new.submitted_snapshot;
  end if;
  if new.submitted_at is not null and v_changed then
    for v_member in select value from jsonb_array_elements(new.submitted_snapshot->'members') loop
      if v_member->>'rank' like '%희망부' and trim(coalesce(v_member->>'name', '')) <> '' then
        if tg_op = 'UPDATE' then
          if exists (
            select 1 from jsonb_array_elements(coalesce(old.submitted_snapshot->'members', '[]'::jsonb)) previous
            where previous->>'id' = v_member->>'id'
              and previous->>'name' = v_member->>'name'
              and previous->>'rank' = v_member->>'rank'
          ) then continue; end if;
        end if;
        insert into mvp_alerts(kind, title, detail, target_url)
          values ('hope_registration', '희망부 선수등록 제출',
            (v_member->>'name') || ' · ' || new.club || ' · ' || (v_member->>'rank'), '/admin/registrations');
      end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists mvp_hope_registration on mvp_rosters;
create trigger mvp_hope_registration after insert or update on mvp_rosters
  for each row execute function alert_hope_registration();
alter function alert_hope_registration() set search_path = public, pg_temp;

create index if not exists mvp_transfers_member_idx on mvp_transfers(member_id);
create index if not exists mvp_transfers_source_chair_idx on mvp_transfers(source_chair_user_id);
create index if not exists mvp_transfers_destination_chair_idx on mvp_transfers(destination_approved_by);
