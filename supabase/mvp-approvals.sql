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
  association_title text not null default '' check (association_title in ('', '협회장', '이사', '총무', '고문')),
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
