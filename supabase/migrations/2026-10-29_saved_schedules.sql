-- The AI-optimized schedule the user chose to keep (Save Schedule button on the Schedule page).
-- One row per user; saving again replaces it. blocks is the same list the optimize-schedule function returns.
-- Run once in the Supabase SQL Editor.
create table if not exists public.saved_schedules (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  summary text,
  blocks jsonb not null,
  saved_at timestamptz not null default now()
);

alter table public.saved_schedules enable row level security;
create policy "own saved schedule" on public.saved_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
