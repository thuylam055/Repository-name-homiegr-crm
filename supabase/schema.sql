-- HOMIE CRM HOÀN CHỈNH
-- Chạy file này trong Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  team_code text unique,
  team_name text not null,
  leader_code text,
  area text,
  note text,
  created_at timestamptz default now()
);

create table if not exists staffs (
  id uuid primary key default gen_random_uuid(),
  staff_code text unique not null,
  full_name text not null,
  phone text,
  birthday date,
  join_date date,
  position text,
  employment_type text,
  team_name text,
  leader_code text,
  area text,
  base_salary numeric default 0,
  status text default 'Đang làm',
  note text,
  created_at timestamptz default now()
);

create table if not exists recruitments (
  id uuid primary key default gen_random_uuid(),
  recruit_code text unique,
  candidate_name text not null,
  phone text,
  source text,
  recruiter_code text,
  interview_date date,
  start_work_date date,
  status text,
  note text,
  created_at timestamptz default now()
);

create table if not exists landlords (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  phone text,
  property_count integer default 0,
  staff_code text,
  cooperation_status text default 'Đang hợp tác',
  note text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique,
  project_name text not null,
  address text,
  landlord_name text,
  source_staff_code text,
  source_date date,
  area text,
  status text,
  note text,
  created_at timestamptz default now()
);

create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  deposit_code text unique,
  project_name text,
  sale_code text,
  customer_name text,
  rent_price numeric default 0,
  deposit_amount numeric default 0,
  deposit_date date,
  status text default 'Đã báo cọc',
  note text,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text unique,
  project_name text,
  sale_code text,
  customer_name text,
  revenue numeric default 0,
  commission numeric default 0,
  transaction_date date,
  status text default 'Đã GDTC',
  note text,
  created_at timestamptz default now()
);

create table if not exists source_rewards (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  source_staff_code text,
  closing_staff_code text,
  source_date date,
  closing_date date,
  reward_amount numeric default 100000,
  payment_status text default 'Chưa thanh toán',
  note text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_name text,
  action_type text,
  module_name text,
  record_id text,
  description text,
  created_at timestamptz default now()
);

alter table teams disable row level security;
alter table staffs disable row level security;
alter table recruitments disable row level security;
alter table landlords disable row level security;
alter table projects disable row level security;
alter table deposits disable row level security;
alter table transactions disable row level security;
alter table source_rewards disable row level security;
alter table audit_logs disable row level security;
