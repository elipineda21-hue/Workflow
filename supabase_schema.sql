-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Storage bucket (do this in Supabase Dashboard → Storage → New bucket)
--   Name:    device-specs
--   Public:  YES  (allows direct PDF download/preview links without auth)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Run this SQL
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ── Device Library ────────────────────────────────────────────────────────────
-- One row per spec sheet PDF. Uploading the same brand+model replaces the entry.
create table if not exists device_library (
  id           uuid        default gen_random_uuid() primary key,
  category     text        not null,  -- 'camera' | 'door' | 'zone' | 'speaker' | 'switch' | 'server'
  brand        text        not null,
  model        text        not null,
  display_name text,                  -- friendly label shown in the UI
  file_path    text        not null,  -- path inside the device-specs storage bucket
  file_name    text        not null,  -- original filename for display
  uploaded_by  text,
  created_at   timestamptz default now(),
  unique (brand, model)               -- one spec sheet per brand+model combination
);

alter table device_library enable row level security;

create policy "Team full access"
  on device_library for all
  using (true)
  with check (true);

-- Storage policy — run in SQL Editor (allows public read + authenticated write)
-- insert into storage.buckets (id, name, public) values ('device-specs', 'device-specs', true)
-- on conflict do nothing;

create policy "Public read device-specs"
  on storage.objects for select
  using (bucket_id = 'device-specs');

create policy "Team upload device-specs"
  on storage.objects for insert
  with check (bucket_id = 'device-specs');

create policy "Team delete device-specs"
  on storage.objects for delete
  using (bucket_id = 'device-specs');
