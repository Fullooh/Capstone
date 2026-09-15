# Capstone

A spaced-repetition study app: students track subjects/topics, take quizzes, and get a personalized review schedule.

## Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/DB**: Supabase (PostgreSQL + Auth)

## Getting Started

1. Copy the env template and fill in your Supabase project credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Values come from your Supabase project settings → API.

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app` — routes (App Router)
- `src/components/ui` — shadcn/ui components
- `src/lib/supabase` — Supabase client helpers (browser, server, middleware)
- `middleware.ts` — refreshes the Supabase auth session on each request

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

## Data model (planned)

Students, subjects, topics, quiz attempts, and review schedules — modeled relationally in Supabase/Postgres. Schema and the spaced-repetition/weak-area-detection logic are not yet implemented.
