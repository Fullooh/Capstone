// Supabase Edge Function: reads the logged-in user's data, asks an LLM (through OpenRouter)
// for an optimized weekly schedule, and returns it to the Schedule page.
// The OpenRouter key lives here as a secret so it never reaches the browser.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   OPENROUTER_API_KEY  required
//   OPENROUTER_MODEL    optional, defaults to DEFAULT_MODEL below
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const categories = ["class", "work", "workout", "personal", "study", "goal"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const systemPrompt = `You are a scheduling assistant for a student who also works, exercises and has personal activities.
Build an optimized weekly schedule (Monday to Sunday) from their data.

Rules:
- Keep fixed commitments (class meetings from subjects.class_days/start_time/end_time, and work shifts) exactly where the user put them. Day fields are free text like "Mon-Fri" or "weekends"; read them sensibly.
- Workouts and personal activities: keep the preferred day/time when it doesn't clash; otherwise move them to the nearest free slot. Default length 1 hour unless the notes say otherwise.
- Add study blocks for each subject so the weekly total matches its study_hours. Give harder subjects (difficulty "high") or lower grades more, earlier-in-the-day slots. Prefer 1–2 hour blocks with breaks between them.
- If goals have deadlines, add a few short blocks to work toward the higher-priority or sooner ones.
- Nothing may overlap. Use times between 07:00 and 23:59, in 24-hour "HH:MM" format, with end after start on the same day.
- Leave time for meals and sleep; don't pack every free hour.
- "summary" is 2–4 sentences for the user explaining the main choices you made.`;

// What the model must return. Also used to validate the reply below.
const responseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string", enum: days },
          start: { type: "string", description: "HH:MM, 24-hour" },
          end: { type: "string", description: "HH:MM, 24-hour" },
          title: { type: "string" },
          category: { type: "string", enum: categories },
        },
        required: ["day", "start", "end", "title", "category"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "blocks"],
  additionalProperties: false,
};

type Block = {
  day: string;
  start: string;
  end: string;
  title: string;
  category: string;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

// Drop anything malformed rather than trusting the model blindly.
function isValidBlock(block: Block) {
  return (
    days.includes(block?.day) &&
    categories.includes(block?.category) &&
    typeof block.title === "string" &&
    timePattern.test(block.start) &&
    timePattern.test(block.end) &&
    block.end > block.start
  );
}

// Some models wrap JSON in ```json fences even when asked not to.
function parseJson(text: string) {
  const cleaned = text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "");
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY is not set" }, 500);

  // Act as the calling user so RLS only returns their own rows.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: "Not logged in" }, 401);

  const [subjects, work, workouts, personal, goals] = await Promise.all([
    supabase.from("subjects").select("name, grade, difficulty, study_hours, class_days, start_time, end_time, notes"),
    supabase.from("work_info").select("job, work_days, start_time, end_time, priority, notes"),
    supabase.from("workouts").select("workout_type, preferred_day, preferred_time, notes"),
    supabase.from("personal_activities").select("activity, day, time, notes"),
    supabase.from("goals").select("goal, priority, deadline, notes"),
  ]);

  const dbError =
    subjects.error ?? work.error ?? workouts.error ?? personal.error ?? goals.error;
  if (dbError) return json({ error: dbError.message }, 500);

  const userData = {
    today: new Date().toISOString().slice(0, 10),
    subjects: subjects.data,
    work: work.data,
    workouts: workouts.data,
    personal_activities: personal.data,
    goals: goals.data,
  };

  const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "My Schedule 360",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userData) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "weekly_schedule", strict: true, schema: responseSchema },
      },
    }),
  });

  if (!llmResponse.ok) {
    const detail = await llmResponse.text();
    console.error("OpenRouter error", llmResponse.status, detail);
    return json({ error: `OpenRouter request failed (${llmResponse.status})` }, 502);
  }

  const completion = await llmResponse.json();
  const content = completion.choices?.[0]?.message?.content;

  let plan: { summary?: string; blocks?: Block[] };
  try {
    plan = parseJson(content ?? "");
  } catch {
    console.error("Unparseable model output", content);
    return json({ error: "The AI returned a schedule we couldn't read. Try again." }, 502);
  }

  const blocks = (plan.blocks ?? []).filter(isValidBlock);
  return json({ summary: plan.summary ?? "", blocks });
});
