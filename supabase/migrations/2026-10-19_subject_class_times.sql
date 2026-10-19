-- Class meeting days and times on subjects (School page). Run once in the Supabase SQL Editor.
-- class_days is free text like work_days ("Mon/Wed/Fri", "Tue-Thu") so the Schedule page can read it.
alter table public.subjects add column if not exists class_days text, add column if not exists start_time time, add column if not exists end_time time;
