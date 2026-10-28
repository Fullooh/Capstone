//Brandon Jaramillo 10/21/26
//Supabase Edge Function: reads the logged-in user's data, asks an LLM (through OpenRouter)
// for an optimized weekly schedule, and returns it to the Schedule page.

import { createClient } from "jsr:@supabase/supabase-js@2";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const categories = ["class", "work", "workout", "personal", "study", "goal"];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

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

type Block = { day: string; start: string; end: string; title: string; category: string };

// Keep only blocks the Schedule page can draw, so a sloppy AI answer can't break the grid.
function cleanBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (b): b is Block =>
      b &&
      days.includes(b.day) &&
      timePattern.test(b.start) &&
      timePattern.test(b.end) &&
      b.start < b.end &&
      typeof b.title === "string" &&
      categories.includes(b.category),
  );
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

  const [classes, work, workouts, personal, goals] = await Promise.all([
    supabase.from("subjects").select("name, difficulty, study_hours, class_days, start_time, end_time"),
    supabase.from("work_info").select("job, work_days, start_time, end_time, priority"),
    supabase.from("workouts").select("workout_type, preferred_day, preferred_time"),
    supabase.from("personal_activities").select("activity, day, time"),
    supabase.from("goals").select("goal, priority, deadline"),
  ]);

  const error = classes.error ?? work.error ?? workouts.error ?? personal.error ?? goals.error;
  if (error) return json({ error: error.message }, 500);

  const userInfo = {
    classes: classes.data,
    work: work.data,
    workouts: workouts.data,
    personal_activities: personal.data,
    goals: goals.data,
  };

  const prompt = `You are a scheduling assistant. Build an optimized weekly schedule from this user's data:

${JSON.stringify(userInfo, null, 2)}

Rules:
- Classes and work shifts are fixed: keep their days and times exactly.
- Add study blocks for each class so the weekly total matches its study_hours. Give harder classes more spread-out sessions.
- Place workouts and personal activities near their preferred day/time, moving them only to avoid overlaps.
- Add a few goal blocks for high-priority goals, especially ones with close deadlines.
- No overlapping blocks. Keep everything between 07:00 and 23:59. Leave breaks for meals and rest.

Reply with ONLY a JSON object, no other text, in this exact shape:
{"summary": "2-3 sentences explaining the main changes",
 "blocks": [{"day": "Monday", "start": "09:00", "end": "10:30", "title": "...", "category": "class"}]}
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

  const blocks = cleanBlocks(plan.blocks);
  if (!blocks.length) return json({ error: "The AI returned an empty schedule. Try again." }, 502);

  return json({ summary: String(plan.summary ?? ""), blocks });
});
