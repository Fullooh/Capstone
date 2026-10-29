-- Greyed-out hours on the Schedule page: times the user doesn't want anything added to.
-- One row per blocked hour (day + hour). The optimize-schedule function sends them to the AI.
-- Run once in the Supabase SQL Editor.
create table if not exists public.blocked_times (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  hour smallint not null check (hour between 0 and 23),
  created_at timestamptz not null default now(),
  unique (user_id, day, hour)
);

alter table public.blocked_times enable row level security;
create policy "own blocked times" on public.blocked_times
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
