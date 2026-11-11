-- Tables for data that used to be saved only in the browser (localStorage):
-- Work hours log + work tasks, Workout log, School assignments / flashcards / class notes,
-- and the Personal diary. Saving it here keeps it across devices and lets the
-- optimize-schedule function use it later.
--
-- id is a uuid the app makes (crypto.randomUUID) so a new item can show up right away.
-- The first time each page loads after this, the app copies that browser's old saved



-- WORK: hours actually worked (Work page > Hours Log)
create table if not exists public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id bigint references public.work_info(id) on delete set null, -- keep the hours if the job is deleted
  date date not null,
  hours numeric not null check (hours > 0 and hours <= 24),
  rate numeric check (rate >= 0), -- $/hour, optional
  notes text,
  created_at timestamptz not null default now()
);

-- WORK: to-dos (Work page > Work Tasks)
create table if not exists public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id bigint references public.work_info(id) on delete set null,
  title text not null,
  due date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- WORKOUT: finished sessions (Workout page > Workout Log)
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  workout text not null,
  minutes integer check (minutes > 0),
  intensity text not null default 'moderate' check (intensity in ('easy', 'moderate', 'hard')),
  notes text,
  created_at timestamptz not null default now()
);

-- SCHOOL: assignments per class (class folder > Assignments). Deleted with the class.
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  title text not null,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- SCHOOL: flashcards per class (class folder > Flashcards)
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  question text not null,
  answer text not null,
  review_status text check (review_status in ('known', 'review')),
  created_at timestamptz not null default now()
);

-- SCHOOL: notes per class (class folder > Notes). Separate from the Notes page's notes table.
create table if not exists public.class_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  title text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- PERSONAL: diary (Personal page > Diary)
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Each user can only see and change their own rows. (One line per policy: the SQL Editor
-- has run only half of a multi-line create policy before.)
alter table public.work_shifts      enable row level security;
alter table public.work_tasks       enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.assignments      enable row level security;
alter table public.flashcards       enable row level security;
alter table public.class_notes      enable row level security;
alter table public.diary_entries    enable row level security;

create policy "own work shifts" on public.work_shifts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own work tasks" on public.work_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workout sessions" on public.workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own assignments" on public.assignments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own flashcards" on public.flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own class notes" on public.class_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own diary entries" on public.diary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
