//Brandon Jaramillo 10/21/26
//Supabase Edge Function: reads the logged-in user's data, asks an LLM (through OpenRouter)
// for an optimized weekly schedule, and returns it to the Schedule page.

import { createClient } from "jsr:@supabase/supabase-js@2";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const categories = ["class", "work", "workout", "personal", "study", "goal"];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// Assignments / work tasks due within this many days get one-time prep blocks,
// and those blocks must fall inside this window.
const planDays = 14;
// Overdue items older than this are probably abandoned, so leave them out.
const overdueDays = 7;

// The page calls this straight from the browser, so CORS headers are needed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// A block with `date` happens once (prep for an assignment or work task); without it, it repeats every week.
type Block = { day: string; start: string; end: string; title: string; category: string; date?: string };
type BlockedRange = { day: string; start: number; end: number };

// Date math on "YYYY-MM-DD" keys in UTC, so the server's own time zone never matters.
function parseDateKey(key: unknown): Date | null {
  if (typeof key !== "string" || !datePattern.test(key)) return null;
  const date = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key ? date : null;
}
function addDaysKey(key: string, count: number) {
  const date = parseDateKey(key)!;
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
const weekdayOf = (key: string) => days[(parseDateKey(key)!.getUTCDay() + 6) % 7];
const daysBetween = (from: string, to: string) =>
  Math.round((parseDateKey(to)!.getTime() - parseDateKey(from)!.getTime()) / 86_400_000);

// e.g. "Friday 2026-11-20 (in 2 days)" so the AI doesn't have to do date math.
function describeDue(today: string, due: string) {
  const left = daysBetween(today, due);
  const when =
    left < 0 ? `${-left} day${left === -1 ? "" : "s"} overdue` : left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
  return `${weekdayOf(due)} ${due} (${when})`;
}

const toHours = (time: string) => Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60;
const toTime = (hour: number) => (hour >= 24 ? "23:59" : `${String(hour).padStart(2, "0")}:00`);

// Blocked hours are stored one row per hour; merge neighbors so the AI sees "Monday 22:00-23:59".
function mergeBlocked(rows: { day: string; hour: number }[]): BlockedRange[] {
  const ranges: BlockedRange[] = [];
  for (const day of days) {
    const hours = rows.filter((r) => r.day === day).map((r) => r.hour).sort((a, b) => a - b);
    for (const hour of hours) {
      const last = ranges.at(-1);
      if (last && last.day === day && last.end === hour) last.end = hour + 1;
      else ranges.push({ day, start: hour, end: hour + 1 });
    }
  }
  return ranges;
}

// Keep only blocks the Schedule page can draw, so a sloppy AI answer can't break the grid.
// A dated block must fall between today and the end of the plan window, on its own weekday.
function cleanBlocks(blocks: unknown, today: string, lastDay: string): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(
      (b) =>
        b &&
        days.includes(b.day) &&
        timePattern.test(b.start) &&
        timePattern.test(b.end) &&
        b.start < b.end &&
        typeof b.title === "string" &&
        categories.includes(b.category) &&
        (b.date == null ||
          (parseDateKey(b.date) !== null && b.date >= today && b.date <= lastDay && weekdayOf(b.date) === b.day)),
    )
    .map((b) => ({
      day: b.day,
      start: b.start,
      end: b.end,
      title: b.title,
      category: b.category,
      ...(b.date ? { date: b.date } : {}),
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY is not set on the server." }, 500);

  // Use the caller's token so RLS only returns their rows.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: "You need to be logged in." }, 401);

  // The page sends its own local date; the server runs on UTC, which can be a day off.
  const body = await req.json().catch(() => null);
  const today = parseDateKey(body?.today) ? (body.today as string) : new Date().toISOString().slice(0, 10);
  const lastDay = addDaysKey(today, planDays - 1);
  const oldestDue = addDaysKey(today, -overdueDays);

  const [classes, work, workouts, personal, goals, blockedRows, assignments, workTasks] = await Promise.all([
    supabase.from("subjects").select("name, difficulty, study_hours, class_days, start_time, end_time"),
    supabase.from("work_info").select("job, work_days, start_time, end_time, priority"),
    supabase.from("workouts").select("workout_type, preferred_day, preferred_time"),
    supabase.from("personal_activities").select("activity, day, time"),
    supabase.from("goals").select("goal, priority, deadline, progress").lt("progress", 100), // skip completed goals
    supabase.from("blocked_times").select("day, hour"),
    // Unfinished assignments / work tasks due soon (or recently overdue), with their class / job name.
    supabase
      .from("assignments")
      .select("title, due_date, priority, subjects(name)")
      .eq("completed", false)
      .gte("due_date", oldestDue)
      .lte("due_date", lastDay)
      .order("due_date"),
    supabase
      .from("work_tasks")
      .select("title, due, priority, work_info(job)")
      .eq("done", false)
      .gte("due", oldestDue)
      .lte("due", lastDay)
      .order("due"),
  ]);

  const error =
    classes.error ??
    work.error ??
    workouts.error ??
    personal.error ??
    goals.error ??
    blockedRows.error ??
    assignments.error ??
    workTasks.error;
  if (error) return json({ error: error.message }, 500);

  // Embedded rows come back as an object (or, depending on the client's typing, a one-item array).
  const embedded = (value: unknown, field: string) => {
    const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null;
    return typeof row?.[field] === "string" ? (row[field] as string) : null;
  };

  const blocked = mergeBlocked(blockedRows.data ?? []);
  const blockedText = blocked.length
    ? blocked.map((r) => `${r.day} ${toTime(r.start)}-${toTime(r.end)}`).join("\n")
    : "None";

  const userInfo = {
    classes: classes.data,
    work: work.data,
    workouts: workouts.data,
    personal_activities: personal.data,
    goals: goals.data,
    assignments: (assignments.data ?? []).map((a) => ({
      class: embedded(a.subjects, "name"),
      title: a.title,
      priority: a.priority,
      due: describeDue(today, a.due_date),
    })),
    work_tasks: (workTasks.data ?? []).map((t) => ({
      job: embedded(t.work_info, "job"),
      title: t.title,
      priority: t.priority,
      due: describeDue(today, t.due),
    })),
  };

  const prompt = `You are a scheduling assistant. Build an optimized weekly schedule from this user's data:

${JSON.stringify(userInfo, null, 2)}

Today is ${weekdayOf(today)} ${today}. The schedule repeats every week, except one-time blocks that have a "date".

Blocked times (the user does NOT want anything scheduled here):
${blockedText}

Rules:
- Never put study, goal, workout or personal blocks inside a blocked time. Move them to free time instead.
- Classes and work shifts are fixed: keep their days and times exactly.
- Add study blocks for each class so the weekly total matches its study_hours. Give harder classes more spread-out sessions.
- Place workouts and personal activities near their preferred day/time, moving them only to avoid overlaps.
- Add a few goal blocks for high-priority goals, especially ones with close deadlines.
- For each assignment and work task, add 1-3 one-time prep blocks before it's due: more time for high priority and closer due dates, overdue ones as soon as possible. Each must have "date" (YYYY-MM-DD, from ${today} to its due date, never after ${lastDay}), and "day" must be that date's weekday. Use category "study" for assignments (title like "Biology: Lab report") and "work" for work tasks.
- Every other block repeats weekly and has no "date".
- One-time blocks must not overlap the recurring blocks on their day.
- No overlapping blocks. Keep everything between 07:00 and 23:59. Leave breaks for meals and rest.

Reply with ONLY a JSON object, no other text, in this exact shape:
{"summary": "2-3 sentences explaining the main changes",
 "blocks": [{"day": "Monday", "start": "09:00", "end": "10:30", "title": "...", "category": "class"},
            {"day": "Thursday", "start": "16:00", "end": "17:00", "title": "...", "category": "study", "date": "YYYY-MM-DD"}]}
day must be one of ${days.join(", ")}. start/end are 24-hour HH:MM. category must be one of ${categories.join(", ")}.`;

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENROUTER_MODEL") ?? "anthropic/claude-sonnet-5.5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    return json({ error: `AI request failed: ${await aiResponse.text()}` }, 502);
  }

  const completion = await aiResponse.json();
  const content: string = completion.choices?.[0]?.message?.content ?? "";

  // Some models wrap JSON in ```json fences, so grab the outermost object.
  let plan;
  try {
    plan = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
  } catch {
    return json({ error: "The AI didn't return a readable schedule. Try again." }, 502);
  }

  // Weekly classes and work shifts are fixed by the user; anything else the AI placed in a
  // blocked time (including one-time work-task prep) is dropped.
  const blocks = cleanBlocks(plan.blocks, today, lastDay).filter(
    (b) =>
      (!b.date && (b.category === "class" || b.category === "work")) ||
      !blocked.some((r) => r.day === b.day && toHours(b.start) < r.end && toHours(b.end) > r.start),
  );
  if (!blocks.length) return json({ error: "The AI returned an empty schedule. Try again." }, 502);

  return json({ summary: String(plan.summary ?? ""), blocks });
});
