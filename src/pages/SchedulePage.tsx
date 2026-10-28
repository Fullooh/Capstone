import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import {
  addDays,
  days,
  formatTime,
  layoutDay,
  parseDays,
  startOfWeek,
  toDateKey,
  toHours,
  type ScheduleItem,
  type Source,
} from "@/lib/schedule";

const startHour = 7;
const endHour = 24;
const slotHeight = 60;
// Workouts and personal activities (and classes without an end time) only have a start time, so give them this length.
const defaultLengthHours = 1;

const sourceStyles: Record<Source, { label: string; className: string; href: string }> = {
  class: { label: "Class", className: "border-indigo-300 bg-indigo-50 text-indigo-900", href: "/school" },
  work: { label: "Work", className: "border-amber-300 bg-amber-50 text-amber-900", href: "/work" },
  workout: { label: "Workout", className: "border-emerald-300 bg-emerald-50 text-emerald-900", href: "/workout" },
  personal: { label: "Personal", className: "border-pink-300 bg-pink-50 text-pink-900", href: "/personal" },
  study: { label: "Study", className: "border-sky-300 bg-sky-50 text-sky-900", href: "/school" },
  goal: { label: "Goal", className: "border-violet-300 bg-violet-50 text-violet-900", href: "/goals" },
};

const gridColumns = { gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" };

// What the optimize-schedule Edge Function returns.
type AiPlan = {
  summary: string;
  blocks: { day: string; start: string; end: string; title: string; category: Source }[];
};

type Deadline = { id: number; goal: string; priority: string | null; deadline: string };

function formatHours(hours: number) {
  return `${Math.round(hours * 10) / 10}h`;
}

export function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [studyTarget, setStudyTarget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  );

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadSchedule() {
    const [classes, work, workouts, personal, goals] = await Promise.all([
      supabase.from("subjects").select("id, name, class_days, start_time, end_time, study_hours"),
      supabase.from("work_info").select("id, job, work_days, start_time, end_time"),
      supabase.from("workouts").select("id, workout_type, preferred_day, preferred_time"),
      supabase.from("personal_activities").select("id, activity, day, time"),
      supabase.from("goals").select("id, goal, priority, deadline").not("deadline", "is", null),
    ]);

    const error =
      classes.error ?? work.error ?? workouts.error ?? personal.error ?? goals.error;
    if (error) {
      toast.error("Couldn't load schedule", { description: error.message });
      setLoading(false);
      return;
    }

    setStudyTarget(
      (classes.data ?? []).reduce((sum, row) => sum + (Number(row.study_hours) || 0), 0),
    );
    setDeadlines((goals.data ?? []) as Deadline[]);
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

  // Keep the "now" line and today's highlight current.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // The recurring schedule is the same every week; the dates only matter for goal deadlines.
  const weekStart = addDays(startOfWeek(now), weekOffset * 7);
  const weekDates = days.map((_, d) => addDays(weekStart, d));
  const weekKeys = weekDates.map(toDateKey);
  const todayIndex = weekKeys.indexOf(toDateKey(now));
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const weekLabel = `${weekDates[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const deadlinesByDay = weekKeys.map((key) =>
    deadlines.filter((goal) => goal.deadline === key),
  );
  const hasDeadlinesThisWeek = deadlinesByDay.some((list) => list.length > 0);

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

  // Hours per category for the week, shown next to each legend chip.
  const totals = {} as Record<Source, number>;
  for (const item of byDay.flat()) {
    totals[item.source] = (totals[item.source] ?? 0) + (item.end - item.start);
  }

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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.keys(sourceStyles) as Source[]).map((source) => (
            <span
              key={source}
              className={`rounded-md border px-2 py-1 font-medium ${sourceStyles[source].className}`}
            >
              {sourceStyles[source].label}
              {totals[source] ? ` · ${formatHours(totals[source])}` : ""}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
            →
          </Button>
          <span className="ml-1 text-sm font-medium">{weekLabel}</span>
        </div>
      </div>

      {!showAi && studyTarget > 0 && !totals.study && (
        <p className="mt-3 text-sm text-muted-foreground">
          Your classes call for {formatHours(studyTarget)} of study time a week,
          but none is scheduled yet. Try <span className="font-medium">Optimize with AI</span> to
          fit it in.
        </p>
      )}

      <section className="mt-4 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[1050px]">
            {/* Day headers */}
            <div className="grid border-b bg-muted/40" style={gridColumns}>
              <div className="border-r p-3 text-xs text-muted-foreground">
                Time
              </div>

              {days.map((day, d) => (
                <div
                  key={day}
                  className={`border-r p-3 text-center last:border-r-0 ${d === todayIndex ? "bg-primary/10" : ""}`}
                >
                  <p className="text-sm font-semibold">{day}</p>
                  <p
                    className={`text-xs ${d === todayIndex ? "font-semibold text-primary" : "text-muted-foreground"}`}
                  >
                    {weekDates[d].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {d === todayIndex && " · Today"}
                  </p>
                </div>
              ))}
            </div>

            {/* Goal deadlines for this week */}
            {hasDeadlinesThisWeek && (
              <div className="grid border-b" style={gridColumns}>
                <div className="border-r px-2 py-2 text-right text-xs text-muted-foreground">
                  Due
                </div>

                {deadlinesByDay.map((list, d) => (
                  <div key={d} className="grid gap-1 border-r p-1 last:border-r-0">
                    {list.map((goal) => (
                      <Link
                        key={goal.id}
                        href="/goals"
                        title={`Goal deadline: ${goal.goal}`}
                        className={`truncate rounded-md border px-2 py-1 text-xs font-medium ${sourceStyles.goal.className}`}
                      >
                        🎯 {goal.goal}
                        {goal.priority === "high" && " (!)"}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="grid" style={gridColumns}>
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
                  className={`relative border-r last:border-r-0 ${d === todayIndex ? "bg-primary/[0.03]" : ""}`}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b"
                      style={{ height: slotHeight }}
                    />
                  ))}

                  {placedByDay[d].map((item) => (
                    <Link
                      key={item.key}
                      href={sourceStyles[item.source].href}
                      title={`${item.title} · ${formatTime(item.start)} – ${formatTime(item.end)}`}
                      className={`absolute overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm transition-shadow hover:shadow-md ${sourceStyles[item.source].className}`}
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
                    </Link>
                  ))}

                  {/* Current time */}
                  {d === todayIndex && nowHour >= startHour && nowHour < endHour && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center print:hidden"
                      style={{ top: (nowHour - startHour) * slotHeight }}
                    >
                      <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                      <span className="h-0.5 flex-1 bg-red-500" />
                    </div>
                  )}
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
                  <Link href={sourceStyles[item.source].href} className="font-medium hover:underline">
                    {item.title}
                  </Link>
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
