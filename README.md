# Capstone

A spaced-repetition study app: students track subjects/topics, take quizzes, and get a personalized review schedule.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend/DB**: Supabase (PostgreSQL + Auth), accessed directly from the client

## Getting Started

1. Copy the env template and fill in your Supabase project credentials (Supabase project settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

## Project structure

- `src/App.tsx` — app entry component
- `src/components/ui` — shadcn/ui components
- `src/lib/supabase.ts` — Supabase client (browser)
- `supabase/schema.sql` — database schema (SQL)

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

## Data model

Tables live in Supabase/Postgres. The SQL that creates them is in `supabase/schema.sql`. When you change the database, run the change in the Supabase SQL Editor and update `schema.sql` to match.

Every table has Row Level Security on, so each user can only read and write their own rows. `user_id` defaults to the logged-in user, so the frontend doesn't need to send it.

| Table | Page | Rows per user | Columns |
|---|---|---|---|
| `profiles` | Signup | 1 (auto-created on signup) | `id`, `first_name`, `last_name` |
| `subjects` | School | many | `id`, `user_id`, `name` |
| `school_info` | School | 1 (save with `upsert`) | `user_id`, `grade`, `difficulty`, `study_hours`, `notes` |
| `work_info` | Work | many | `id`, `user_id`, `job`, `work_days`, `start_time`, `end_time`, `priority`, `notes` |
| `notes` | Notes | many | `id`, `user_id`, `title`, `category`, `body` |

`difficulty` and `priority` accept `low` / `medium` / `high`. `category` accepts `general` / `school` / `work` / `personal` / `goal`.
