# My Schedule 360

A life-scheduling web app for students. You enter your classes, jobs, workouts, personal activities and goals, and the app shows them on one weekly calendar. An AI optimizer can then build a balanced week for you: it adds study time, plans prep sessions before assignments and work tasks are due, and works around hours you've blocked off.

## Features

| Page | What it does |
|---|---|
| **Dashboard** | Overview and links to every section |
| **School** | Classes with grade, difficulty, weekly study hours and meeting times. Each class has a folder with **assignments**, **flashcards** and **class notes** |
| **Work** | Jobs and regular shifts, an **hours log** with pay, and **work tasks** with due dates |
| **Workout** | A weekly routine, a **workout log** of finished sessions, and progress (weekly goal and streaks) |
| **Personal** | Recurring personal activities and a **diary** |
| **Goals** | Goals with priority, deadline and a **progress slider**; completed goals move to Achievements |
| **Notes** | Notes sorted into folders (General, School, Work, Personal, Goals), with search and ★ favorites |
| **Schedule** | Weekly hour-by-hour calendar. Use **Block Times** to grey out hours you're busy, click **Optimize with AI** for a suggested week, and **save** the plan you like |

Every user has an account (Supabase Auth). Each user can only see their own data, and it's saved in the database, so it carries across devices.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui, with toasts from `sonner`
- **Database and auth:** Supabase (PostgreSQL + Auth), called directly from the browser. Row Level Security keeps each user's rows private.
- **AI:** a Supabase Edge Function (`optimize-schedule`) that sends the user's data to an LLM through [OpenRouter](https://openrouter.ai) and returns a weekly plan

There's no separate backend server.

## Getting started

You'll need Node.js 20.19+ (or 22.12+), a Supabase project, and the [Supabase CLI](https://supabase.com/docs/guides/cli) if you'll be deploying the AI function.

### 1. Set up the database

In the Supabase dashboard, open **SQL Editor** and run these files in order:

1. `supabase/schema.sql`: the core tables, the signup trigger and the security policies
2. Each file in `supabase/migrations/`, oldest first (the file names start with their dates)

The migrations are safe to run on a fresh database. The ones whose changes `schema.sql` already includes do nothing.

> **Tip:** If the SQL Editor ever creates only part of a `create policy` statement, run that statement again on its own. This has happened before with policies split over several lines.

### 2. Connect the app

```bash
cp .env.local.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Supabase → Project Settings → API**. Only the public anon key goes here. Never put a service-role key or the OpenRouter key in a `VITE_` variable, because those are bundled into the browser code.

### 3. Run it

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000.

### 4. Deploy the AI optimizer (optional)

The Schedule page works without this; only the **Optimize with AI** button needs it.

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set OPENROUTER_API_KEY=<your-openrouter-key>
supabase functions deploy optimize-schedule
```

You can also set `OPENROUTER_MODEL` to choose a different model. The default is `anthropic/claude-sonnet-5.5`. Redeploy the function whenever `supabase/functions/optimize-schedule/index.ts` changes, because pushing to GitHub doesn't update it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

## Project structure

```
src/
  App.tsx              routes (one case per page)
  pages/               one file per page (SchoolPage, WorkPage, SchedulePage, ...)
  components/          shared page pieces (FolderPage layout, Work/Workout/School sections)
  components/ui/       shadcn/ui components
  lib/
    supabase.ts        Supabase client
    router.tsx         small client-side router (Link, navigate)
    synced-list.ts     useSyncedList: load/add/update/delete a user's rows in one table
    schedule.ts        date and calendar helpers for the Schedule page
    page-utils.ts      login check, formatting helpers
supabase/
  schema.sql           full database schema
  migrations/          dated changes made after schema.sql (run in order)
  functions/
    optimize-schedule/ the AI schedule Edge Function
```

To add a shadcn/ui component: `npx shadcn@latest add <component>`

## How the AI optimizer works

1. The Schedule page calls the `optimize-schedule` function and sends today's date.
2. The function runs as the logged-in user, so it can only read that user's rows. It loads:
   - classes, jobs and shifts, workouts and personal activities
   - unfinished goals
   - blocked hours
   - unfinished assignments and work tasks due in the next 14 days, or overdue by up to 7 days
3. It asks the LLM for a schedule with two kinds of blocks:
   - **Weekly blocks** repeat every week: classes, shifts, study time, workouts, personal activities and goals. Classes and shifts keep their real times.
   - **One-time blocks** have a `date` and are prep sessions before an assignment or work task is due. They appear only in the week that contains that date.
4. The function checks the answer before returning it. It drops any block with a bad day, time, category or date, and any non-fixed block that lands in a blocked hour.
5. The user can save the plan. There's one saved plan per user, in `saved_schedules`.

## Data model

Every table has Row Level Security turned on, so each user can only read and write their own rows. `user_id` defaults to the logged-in user, so the frontend doesn't need to send it. When you change the database, add a dated file to `supabase/migrations/` and update `schema.sql` to match.

| Table | Page | Main columns |
|---|---|---|
| `profiles` | Signup | `first_name`, `last_name` (one row per user, created automatically at signup) |
| `subjects` | School | `name`, `grade`, `difficulty`, `study_hours`, `class_days`, `start_time`, `end_time`, `notes` |
| `assignments` | School → class folder | `subject_id`, `title`, `due_date`, `priority`, `completed` |
| `flashcards` | School → class folder | `subject_id`, `question`, `answer`, `review_status` |
| `class_notes` | School → class folder | `subject_id`, `title`, `content` |
| `work_info` | Work | `job`, `work_days`, `start_time`, `end_time`, `priority`, `notes` |
| `work_shifts` | Work → Hours Log | `job_id`, `date`, `hours`, `rate`, `notes` |
| `work_tasks` | Work → Work Tasks | `job_id`, `title`, `due`, `priority`, `done` |
| `workouts` | Workout | `workout_type`, `preferred_day`, `preferred_time`, `notes` |
| `workout_sessions` | Workout → Log | `date`, `workout`, `minutes`, `intensity`, `notes` |
| `personal_activities` | Personal | `activity`, `day`, `time`, `notes` |
| `diary_entries` | Personal → Diary | `date`, `title`, `content` |
| `goals` | Goals | `goal`, `priority`, `deadline`, `notes`, `progress` (0–100, where 100 means completed) |
| `notes` | Notes | `title`, `category`, `body`, `pinned` (★ favorite) |
| `blocked_times` | Schedule | `day`, `hour` (one row per blocked hour) |
| `saved_schedules` | Schedule | `summary`, `blocks` (JSON; one row per user) |

Allowed values:
- `difficulty` and `priority`: `low`, `medium`, `high`
- `intensity`: `easy`, `moderate`, `hard`
- `notes.category`: `general`, `school`, `work`, `personal`, `goal`

Deleting a class also deletes its assignments, flashcards and class notes. Deleting a job keeps its logged hours and tasks.

### Saving data: use the database, not the browser

Save user data in Supabase, not `localStorage`. Data kept only in the browser isn't tied to the user's account, doesn't sync between devices, and the AI optimizer can't see it. For a new list of items, add a table with a migration and use the `useSyncedList` hook in `src/lib/synced-list.ts`. `localStorage` is fine for small per-browser preferences, such as the weekly workout goal.

## Team

Built as a capstone project by Brandon Jaramillo (backend: database, security and the AI optimizer), Waaris Badirou and Fullooh (frontend pages and features).
