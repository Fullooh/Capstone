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

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

## Data model (planned)

Students, subjects, topics, quiz attempts, and review schedules — modeled relationally in Supabase/Postgres. Schema and the spaced-repetition/weak-area-detection logic are not yet implemented.
