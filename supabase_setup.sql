-- ============================================================
-- DOJO OS — Supabase Database Setup
-- Run this ONCE in your Supabase project:
--   Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- ── 1. ATHLETE DATA TABLE ────────────────────────────────────
-- One row per storage key per user.
-- All 12 app keys map to rows in this single table.
-- data_value stores the JSON blob exactly as localStorage does.

create table if not exists public.dojo_sync (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data_key    text not null,           -- e.g. 'dojo_v1', 'dojo_tf_v1'
  data_value  jsonb,                   -- the full JSON payload
  updated_at  timestamptz not null default now(),

  -- One row per key per user — upsert-safe
  unique(user_id, data_key),

  -- Whitelist of valid keys — prevents clients writing arbitrary keys
  constraint valid_data_key check (
    data_key in (
      'dojo_v1',
      'dojo_tf_v1',
      'dojo_bm_v1',
      'dojo_phys_v1',
      'dojo_craft_scores',
      'dojo_scenes',
      'dojo_tapes',
      'dojo_contacts',
      'dojo_events',
      'dojo_reel_notes',
      'dojo_tl_tasks_v1',
      'dojo_h30_v1',
      'dojo_history_v1'
    )
  )
);

-- ── 2. COACH ACCESS TABLE ─────────────────────────────────────
-- Stores which coach email has read-only access to which athlete.
-- You insert one row to grant access; delete it to revoke.
-- Coach is identified by their Supabase auth email — not hardcoded.

create table if not exists public.coach_access (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references auth.users(id) on delete cascade,
  coach_email  text not null,
  granted_at   timestamptz not null default now(),

  unique(athlete_id, coach_email)
);

-- ── 3. ROW LEVEL SECURITY ─────────────────────────────────────
-- Critical: without RLS, any authenticated user can read all rows.

alter table public.dojo_sync    enable row level security;
alter table public.coach_access enable row level security;

-- Drop any existing policies before recreating (idempotent)
drop policy if exists "athlete_full_access"      on public.dojo_sync;
drop policy if exists "coach_read_access"         on public.dojo_sync;
drop policy if exists "athlete_manages_coaches"   on public.coach_access;

-- Policy 1: Athlete has full read/write on their own rows only
create policy "athlete_full_access"
  on public.dojo_sync
  for all
  using  ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

-- Policy 2: Coach can SELECT (read-only) rows where their email
--           is listed in coach_access for that athlete.
--           Coach can NEVER insert, update, or delete.
create policy "coach_read_access"
  on public.dojo_sync
  for select
  using (
    exists (
      select 1
      from public.coach_access ca
      where ca.athlete_id  = dojo_sync.user_id
        and ca.coach_email = (
          select email from auth.users where id = auth.uid()
        )
    )
  );

-- Policy 3: Only the athlete can manage their own coach_access rows
create policy "athlete_manages_coaches"
  on public.coach_access
  for all
  using  ( athlete_id = auth.uid() )
  with check ( athlete_id = auth.uid() );

-- ── 4. UPDATED_AT TRIGGER ─────────────────────────────────────
-- Auto-updates updated_at on every write — used for sync conflict resolution

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dojo_sync_updated_at on public.dojo_sync;
create trigger trg_dojo_sync_updated_at
  before update on public.dojo_sync
  for each row execute function public.set_updated_at();

-- ── 5. INDEXES ────────────────────────────────────────────────
create index if not exists idx_dojo_sync_user_id    on public.dojo_sync(user_id);
create index if not exists idx_dojo_sync_updated_at on public.dojo_sync(updated_at desc);
create index if not exists idx_coach_access_email   on public.coach_access(coach_email);

-- ── 6. GRANT COACH ACCESS (run separately when ready) ─────────
-- Replace with your coach's actual email address.
-- Do NOT run this block until your coach has signed in at least once
-- (so their account exists in auth.users).
--
-- insert into public.coach_access (athlete_id, coach_email)
-- values (
--   auth.uid(),                      -- run while logged in as yourself
--   'your-coach@email.com'           -- your coach's email
-- );
--
-- To REVOKE coach access later:
-- delete from public.coach_access
-- where athlete_id = auth.uid()
--   and coach_email = 'your-coach@email.com';

-- ── DONE ──────────────────────────────────────────────────────
-- Verify setup:
--   select * from public.dojo_sync;        -- should be empty
--   select * from public.coach_access;     -- should be empty
--   select * from pg_policies
--     where tablename in ('dojo_sync','coach_access');
