-- Run this in: Supabase dashboard → SQL Editor → New query → Run

create table if not exists work_orders (
  id                 uuid        default gen_random_uuid() primary key,
  monday_project_id  text        unique not null,
  project_name       text,
  project_ref        text,
  state              jsonb       default '{}',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Allow the team to read/write without logging in (no auth yet)
alter table work_orders enable row level security;

create policy "Team full access"
  on work_orders for all
  using (true)
  with check (true);
