-- Two things that were being saved only in the browser (localStorage) now live in Supabase:
--   goals.progress  - the completion % slider on the Goals page (100 = completed)
--   notes.pinned    - the ★ favorites on the Notes page
-- The first time each page loads after this, the app copies that browser's old saved
-- goals / favorites into these tables and removes them from the browser.

alter table public.goals add column if not exists progress integer not null default 0 check (progress between 0 and 100);
alter table public.notes add column if not exists pinned boolean not null default false;
