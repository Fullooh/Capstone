import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const startHour = 7;
const endHour = 24;
const slotHeight = 60;
// Workouts and personal activities (and classes without an end time) only have a start time, so give them this length.
const defaultLengthHours = 1;

type Source = "class" | "work" | "workout" | "personal" | "study" | "goal";

const sourceStyles: Record<Source, { label: string; className: string }> = {
  class: { label: "Class", className: "border-indigo-300 bg-indigo-50 text-indigo-900" },
  work: { label: "Work", className: "border-amber-300 bg-amber-50 text-amber-900" },
  workout: { label: "Workout", className: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  personal: { label: "Personal", className: "border-pink-300 bg-pink-50 text-pink-900" },
  study: { label: "Study", className: "border-sky-300 bg-sky-50 text-sky-900" },
  goal: { label: "Goal", className: "border-violet-300 bg-violet-50 text-violet-900" },
};

// What the optimize-schedule Edge Function returns.
type AiPlan = {
  summary: string;
  blocks: { day: string; start: string; end: string; title: string; category: Source }[];
};

type ScheduleItem = {
  key: string;
  title: string;
  source: Source;
  dayText: string | null;
  start: number | null; // hours since midnight, e.g. 13.5 = 1:30 PM
  end: number | null;
};

type PlacedItem = ScheduleItem & {
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

function formatTime(hour: number) {
  const h = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Postgres returns times as "HH:MM:SS"; turn them into hours since midnight.
function toHours(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

// "mon", "tues", "thurs", "friday"... -> index into `days`. The word must be the start
// of a day name and at least 3 letters, so words like "the", "thru" or "we" don't count.
function dayIndex(word: string) {
  if (word.length < 3) return -1;
  return days.findIndex((day) => day.toLowerCase().startsWith(word));
}

// Days are typed as free text, so read them loosely:
// "Monday", "mon", "Mon/Wed/Fri", "Monday - Friday", "weekdays", "weekends", "daily".
function parseDays(text: string | null) {
  if (!text) return [];
  const value = text.toLowerCase();
  const result = new Set<number>();

  if (/\b(daily|every ?day|all week)\b/.test(value)) return [0, 1, 2, 3, 4, 5, 6];
  if (/\bweekdays?\b/.test(value)) [0, 1, 2, 3, 4].forEach((d) => result.add(d));
  if (/\bweekends?\b/.test(value)) [5, 6].forEach((d) => result.add(d));

  // Ranges like "Mon-Fri" or "Monday to Thursday"
  const rangePattern = /([a-z]+)\s*(?:-|–|to|through|thru)\s*([a-z]+)/g;
  for (const [, from, to] of value.matchAll(rangePattern)) {
    const a = dayIndex(from);
    const b = dayIndex(to);
    if (a === -1 || b === -1) continue;
    for (let d = a; d !== (b + 1) % 7; d = (d + 1) % 7) result.add(d);
  }

  for (const word of value.split(/[^a-z]+/)) {
    const d = dayIndex(word);
    if (d !== -1) result.add(d);
  }

  return [...result].sort();
}

// Side-by-side lanes for items that overlap on the same day.
function layoutDay(items: (ScheduleItem & { start: number; end: number })[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: PlacedItem[] = [];
  let group: PlacedItem[] = [];
  let groupEnd = -1;
  let laneEnds: number[] = [];

  const closeGroup = () => {
    group.forEach((item) => (item.lanes = laneEnds.length));
    placed.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.end;
    groupEnd = Math.max(groupEnd, item.end);
    group.push({ ...item, lane, lanes: 1 });
  }
  closeGroup();

  return placed;
}

export function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  );

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadSchedule() {
    const [classes, work, workouts, personal] = await Promise.all([
      supabase.from("subjects").select("id, name, class_days, start_time, end_time"),
      supabase.from("work_info").select("id, job, work_days, start_time, end_time"),
      supabase.from("workouts").select("id, workout_type, preferred_day, preferred_time"),
      supabase.from("personal_activities").select("id, activity, day, time"),
    ]);

    const error = classes.error ?? work.error ?? workouts.error ?? personal.error;
    if (error) {
      toast.error("Couldn't load schedule", { description: error.message });
      setLoading(false);
      return;
    }

    setItems([
      // Subjects with no class days are study-only, so leave them off the grid.
      ...(classes.data ?? [])
        .filter((row) => row.class_days || row.start_time)
        .map((row) => ({
          key: `class-${row.id}`,
          title: row.name,
          source: "class" as const,
          dayText: row.class_days,
          start: toHours(row.start_time),
          end: toHours(row.end_time),
        })),
      ...(work.data ?? []).map((row) => ({
        key: `work-${row.id}`,
        title: row.job,
        source: "work" as const,
        dayText: row.work_days,
        start: toHours(row.start_time),
        end: toHours(row.end_time),
      })),
      ...(workouts.data ?? []).map((row) => ({
        key: `workout-${row.id}`,
        title: row.workout_type,
        source: "workout" as const,
        dayText: row.preferred_day,
        start: toHours(row.preferred_time),
        end: null,
      })),
      ...(personal.data ?? []).map((row) => ({
        key: `personal-${row.id}`,
        title: row.activity,
        source: "personal" as const,
        dayText: row.day,
        start: toHours(row.time),
        end: null,
      })),
    ]);
    setLoading(false);
  }

  // The Edge Function reads the user's data itself, so nothing needs to be sent.
  async function optimizeSchedule() {
    setOptimizing(true);
    const { data, error } = await supabase.functions.invoke<AiPlan>("optimize-schedule");
    setOptimizing(false);

    if (error || !data) {
      // The function's own error message is in the response body.
      const body = await error?.context?.json?.().catch(() => null);
      toast.error("Couldn't optimize schedule", {
        description: body?.error ?? error?.message,
      });
      return;
    }

    setAiPlan(data);
    setShowAi(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }
      loadSchedule();
    });
  }, []);

  // Split items into ones that fit on the grid (per day) and ones that don't, with a reason.
  const byDay: (ScheduleItem & { start: number; end: number })[][] = days.map(() => []);
  const unplaced: { item: ScheduleItem; reason: string }[] = [];

  if (showAi && aiPlan) {
    aiPlan.blocks.forEach((block, i) => {
      const d = days.indexOf(block.day);
      const start = toHours(block.start)!;
      const end = toHours(block.end)!;
      if (d === -1) return;
      byDay[d].push({
        key: `ai-${i}`,
        title: block.title,
        source: block.category,
        dayText: block.day,
        start: Math.max(start, startHour),
        end: Math.min(end, endHour),
      });
    });
  }

  for (const item of showAi ? [] : items) {
    const dayIndexes = parseDays(item.dayText);
    if (!item.dayText) unplaced.push({ item, reason: "No day set" });
    else if (dayIndexes.length === 0)
      unplaced.push({ item, reason: `Couldn't read the day "${item.dayText}"` });
    else if (item.start === null) unplaced.push({ item, reason: "No time set" });
    else {
      // An end at or before the start (e.g. a night shift) runs to the end of the grid.
      let end = item.end ?? item.start + defaultLengthHours;
      if (end <= item.start) end = endHour;
      const start = Math.max(item.start, startHour);
      end = Math.min(end, endHour);

      if (end <= startHour) {
        unplaced.push({ item, reason: `Before ${formatTime(startHour)}` });
        continue;
      }
      dayIndexes.forEach((d) => byDay[d].push({ ...item, start, end }));
    }
  }

  const placedByDay = byDay.map(layoutDay);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            My Schedule
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your week, organized hour by hour.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {aiPlan && (
            <Button onClick={() => setShowAi(!showAi)} variant="outline">
              {showAi ? "Show My Schedule" : "Show AI Schedule"}
            </Button>
          )}
          <Button onClick={optimizeSchedule} disabled={optimizing || loading}>
            {optimizing ? "Optimizing..." : aiPlan ? "Re-optimize" : "Optimize with AI"}
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            Print Schedule
          </Button>
        </div>
      </div>

      {showAi && aiPlan && (
        <section className="mt-6 rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-sm">
          <p className="font-semibold">AI-optimized schedule</p>
          <p className="mt-1 text-muted-foreground">{aiPlan.summary}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            This is a suggestion — nothing has been saved or changed.
          </p>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        {(Object.keys(sourceStyles) as Source[]).map((source) => (
          <span
            key={source}
            className={`rounded-md border px-2 py-1 font-medium ${sourceStyles[source].className}`}
          >
            {sourceStyles[source].label}
          </span>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[1050px]">
            {/* Day headers */}
            <div
              className="grid border-b bg-muted/40"
              style={{
                gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
              }}
            >
              <div className="border-r p-3 text-xs text-muted-foreground">
                Time
              </div>

              {days.map((day) => (
                <div
                  key={day}
                  className="border-r p-3 text-center text-sm font-semibold last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
              }}
            >
              {/* Time labels */}
              <div className="border-r">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="box-border border-b px-2 pt-1 text-right text-xs text-muted-foreground"
                    style={{ height: slotHeight }}
                  >
                    {formatTime(hour)}
                  </div>
                ))}

                {/* Midnight boundary */}
                <div className="px-2 pt-1 text-right text-xs text-muted-foreground">
                  12:00 AM
                </div>
              </div>

              {/* Seven day columns */}
              {days.map((day, d) => (
                <div
                  key={day}
                  className="relative border-r last:border-r-0"
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b"
                      style={{ height: slotHeight }}
                    />
                  ))}

                  {placedByDay[d].map((item) => (
                    <div
                      key={item.key}
                      title={`${item.title} · ${formatTime(item.start)} – ${formatTime(item.end)}`}
                      className={`absolute overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm ${sourceStyles[item.source].className}`}
                      style={{
                        top: (item.start - startHour) * slotHeight + 1,
                        height: (item.end - item.start) * slotHeight - 2,
                        left: `calc(${(item.lane / item.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / item.lanes}% - 4px)`,
                      }}
                    >
                      <p className="font-semibold break-words">{item.title}</p>
                      <p className="opacity-80">
                        {formatTime(item.start)} – {formatTime(item.end)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showAi ? null : loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your schedule will appear here once activities are added from your
          other sections.
        </p>
      ) : (
        unplaced.length > 0 && (
          <section className="mt-6 rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Not on the schedule</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These need a day (like "Monday" or "Mon-Fri") and a time to show
              up on the grid.
            </p>
            <ul className="mt-4 grid gap-2 text-sm">
              {unplaced.map(({ item, reason }) => (
                <li key={item.key} className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium ${sourceStyles[item.source].className}`}
                  >
                    {sourceStyles[item.source].label}
                  </span>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">· {reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </main>
  );
}
