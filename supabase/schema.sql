-- This is the initial schema for the School, Work, Notes and Signup pages.
-- (Brandon) I applied this to the shared Supabase project on 2026-10-07.


-- PROFILES: first/last name from the Signup page
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before the trigger existed
insert into public.profiles (id, first_name, last_name)
select id, raw_user_meta_data ->> 'first_name', raw_user_meta_data ->> 'last_name'
from auth.users
on conflict (id) do nothing;

-- SUBJECTS: "Your Subjects" on the School page (many per user)
create table if not exists public.subjects (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- SCHOOL INFO: grade, difficulty, study hours, notes (one row per user; save with upsert)
create table public.school_info (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  grade numeric check (grade >= 0),
  difficulty text check (difficulty in ('low', 'medium', 'high')),
  study_hours numeric check (study_hours >= 0),
  notes text,
  updated_at timestamptz not null default now()
);

-- WORK INFO: job, days, hours, priority, notes (many per user)
create table public.work_info (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job text not null,
  work_days text,
  start_time time,
  end_time time,
  priority text check (priority in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz not null default now()
);

-- NOTES: title, category, body (many per user)
create table public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'general'
    check (category in ('general', 'school', 'work', 'personal', 'goal')),
  body text,
  created_at timestamptz not null default now()
);

--RLS (Row level security) we enable this to each table to check every row before 
--allowing access without this umm it would be very bad a person could then have 
--acces to other peoples row which is very bad.
alter table public.profiles    enable row level security;
alter table public.subjects    enable row level security;
alter table public.school_info enable row level security;
alter table public.work_info   enable row level security;
alter table public.notes       enable row level security;
-- makes sure that users can view,read and edit only their own data
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own subjects" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own school info" on public.school_info
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own work info" on public.work_info
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
