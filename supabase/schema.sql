-- Full schema for every page: Signup, School, Work, Notes, Goals, Workout and Personal.
-- (Brandon) I applied the original version to the shared Supabase project on 2026-10-07.
-- Since then: per-class columns on subjects (2026-10-12), and goals, workouts and
-- personal_activities (2026-10-13), all already applied. Only migrations/2026-10-13_drop_school_info.sql is separate.


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

-- SUBJECTS: classes on the School page, each with its own grade/difficulty/study time (many per user)
create table if not exists public.subjects (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  grade numeric check (grade >= 0),
  difficulty text check (difficulty in ('low', 'medium', 'high')),
  study_hours numeric check (study_hours >= 0),
  notes text,
  created_at timestamptz not null default now()
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

-- GOALS: goal, priority, deadline, notes (many per user)
create table public.goals (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal text not null,
  priority text check (priority in ('low', 'medium', 'high')),
  deadline date,
  notes text,
  created_at timestamptz not null default now()
);

-- WORKOUTS: workout type, preferred day/time, notes (many per user)
create table public.workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_type text not null,
  preferred_day text,
  preferred_time time,
  notes text,
  created_at timestamptz not null default now()
);

-- PERSONAL ACTIVITIES: activity, day, time, notes (many per user)
create table public.personal_activities (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity text not null,
  day text,
  time time,
  notes text,
  created_at timestamptz not null default now()
);

--RLS (Row level security) we enable this to each table to check every row before 
--allowing access without this umm it would be very bad a person could then have 
--acces to other peoples row which is very bad.
alter table public.profiles    enable row level security;
alter table public.subjects    enable row level security;
alter table public.work_info   enable row level security;
alter table public.notes       enable row level security;
alter table public.goals       enable row level security;
alter table public.workouts    enable row level security;
alter table public.personal_activities enable row level security;
-- makes sure that users can view,read and edit only their own data
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own subjects" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own work info" on public.work_info
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own personal activities" on public.personal_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
