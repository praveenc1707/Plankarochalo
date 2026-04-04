-- ============================================================
-- Plan Karo Chalo — Supabase Setup
-- ============================================================
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- Create the trips table
create table if not exists trips (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable row-level security (required by Supabase)
alter table trips enable row level security;

-- Allow all operations (open access for MVP — tighten later)
create policy "Allow all operations" on trips
  for all
  using (true)
  with check (true);

-- Enable real-time subscriptions for this table
alter publication supabase_realtime add table trips;

-- Done! Now go to Project Settings → API and copy your URL + anon key.
