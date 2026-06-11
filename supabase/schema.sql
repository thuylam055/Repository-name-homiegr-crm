-- QUẢN LÝ NỘI BỘ HOMIE CRM DATABASE

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  role text check (role in ('Admin','HR','Kế toán','Leader','Sale')) default 'Sale',
  staff_code text,
  created_at timestamptz default now()
);

create table if not exists monthly_periods (
  id uuid primary key default gen_random_uuid(),
  month text unique not null,
  is_locked boolean default false,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  name text not null,
  leader_code text,
  area text,
  note text,
  created_at timestamptz default now(),
  unique(month, name)
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  code text not null,
  full_name text not null,
  phone text,
  dob date,
  start_date date,
  position text,
  staff_type text,
  gender text,
  team text,
  leader_code text,
  area text,
  salary numeric default 0,
  email text,
  citizen_id text,
  end_date date,
  status text default 'Đang làm',
  note text,
  created_at timestamptz default now(),
  unique(month, code)
);

create table if not exists recruits (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  code text not null,
  full_name text not null,
  phone text,
  source text,
  recruiter_code text,
  team text,
  area text,
  interview_date date,
  start_date date,
  status text,
  cost numeric default 0,
  created_at timestamptz default now(),
  unique(month, code)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  code text not null,
  name text not null,
  area text,
  team text,
  owner_code text,
  closer_code text,
  close_date date,
  sale_commission numeric default 0,
  company_amount numeric default 0,
  status text,
  source text,
  note text,
  created_at timestamptz default now(),
  unique(month, code)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text,
  record_code text,
  action text,
  old_data jsonb,
  new_data jsonb,
  actor text,
  created_at timestamptz default now()
);
