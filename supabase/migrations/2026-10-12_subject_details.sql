-- Per-class details on the School page. Run once in the Supabase SQL Editor.
alter table public.subjects
  add column if not exists grade numeric check (grade >= 0),
  add column if not exists difficulty text check (difficulty in ('low', 'medium', 'high')),
  add column if not exists study_hours numeric check (study_hours >= 0),
  add column if not exists notes text;
