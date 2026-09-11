-- 군산시탁구협회 MVP 핵심 스키마
create extension if not exists pgcrypto;

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  club_id uuid references clubs(id) on delete set null,
  role text not null default 'member' check (role in ('member','club_manager','officer','admin')),
  member_status text not null default 'active' check (member_status in ('active','inactive','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists association_officers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  term_start date,
  term_end date,
  active boolean not null default true
);

create table if not exists club_officers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  unique (club_id, profile_id, title)
);

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  active boolean not null default true,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('association','league','board','official')),
  title text not null,
  content text not null,
  visibility text not null default 'public' check (visibility in ('public','member','officer')),
  author_id uuid references profiles(id) on delete set null,
  published_at timestamptz not null default now()
);

create table if not exists registration_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  quarter int not null check (quarter between 1 and 4),
  starts_at date,
  ends_at date,
  status text not null default 'open' check (status in ('open','closed')),
  unique(year, quarter)
);

create table if not exists member_registrations (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references registration_periods(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  unique(period_id, profile_id)
);

create table if not exists transfer_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  from_club_id uuid not null references clubs(id),
  to_club_id uuid not null references clubs(id),
  status text not null default 'requested' check (status in ('requested','from_approved','to_approved','approved','rejected')),
  requested_at timestamptz not null default now(),
  from_approved_at timestamptz,
  to_approved_at timestamptz,
  association_approved_at timestamptz
);

create table if not exists league_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  status text not null default 'active' check (status in ('draft','active','finished'))
);

create table if not exists league_matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references league_seasons(id) on delete cascade,
  match_date date not null,
  home_club_id uuid not null references clubs(id),
  away_club_id uuid not null references clubs(id),
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists league_player_matches (
  id uuid primary key default gen_random_uuid(),
  league_match_id uuid not null references league_matches(id) on delete cascade,
  home_player_id uuid not null references profiles(id),
  away_player_id uuid not null references profiles(id),
  home_score int not null,
  away_score int not null,
  winner_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
