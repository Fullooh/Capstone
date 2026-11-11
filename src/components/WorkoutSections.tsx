import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { addDays, days, parseDays, startOfWeek, toDateKey } from "@/lib/schedule";
import { formatClock, formatDate, textOrNull, todayKey } from "@/lib/page-utils";
import { Chip, EmptyState, SectionIntro, inputClass } from "@/components/FolderPage";
import { oldNumber, oldText, type SyncedListOptions } from "@/lib/synced-list";

export type Workout = {
  id: number;
  workout_type: string;
  preferred_day: string | null;
  preferred_time: string | null;
  notes: string | null;
};

export type Intensity = "easy" | "moderate" | "hard";

export type WorkoutSession = {
  id: string;
  date: string; // YYYY-MM-DD
  workout: string;
  minutes: number | null;
  intensity: Intensity;
  notes: string;
};

const isIntensity = (value: unknown): value is Intensity =>
  value === "easy" || value === "moderate" || value === "hard";

// Supabase table workout_sessions (migrations/2026-11-11_browser_data_tables.sql).
type SessionRow = {
  date: string;
  workout: string;
  minutes: number | null;
  intensity: Intensity;
  notes: string | null;
};

export function sessionTable(userId: string | null): SyncedListOptions<WorkoutSession, SessionRow> {
  return {
    table: "workout_sessions",
    userId,
    label: "workout log",
    fromRow: (row) => ({
      id: row.id,
      date: row.date,
      workout: row.workout,
      minutes: row.minutes,
      intensity: row.intensity,
      notes: row.notes ?? "",
    }),
    toRow: (s) => ({
      date: s.date,
      workout: s.workout,
      minutes: s.minutes,
      intensity: s.intensity,
      notes: s.notes || null,
    }),
    legacy: userId
      ? {
          key: `my-schedule-360-workout-${userId}`,
          field: "log",
          toItem: (old) => {
            const date = oldText(old.date);
            const workout = oldText(old.workout);
            if (!date || !workout) return null;
            const minutes = oldNumber(old.minutes);
            return {
              id: oldText(old.id) ?? "",
              date,
              workout,
              minutes: minutes === null ? null : Math.round(minutes),
              intensity: isIntensity(old.intensity) ? old.intensity : "moderate",
              notes: oldText(old.notes) ?? "",
            };
          },
        }
      : undefined,
  };
}

const intensityStyles: Record<Intensity, string> = {
  easy: "bg-sky-50 text-sky-700",
  moderate: "bg-amber-50 text-amber-700",
  hard: "bg-rose-50 text-rose-700",
};

const todayIndex = () => (new Date().getDay() + 6) % 7; // Monday = 0, like `days`

/* ---------------------------------------------------------------- Routine */

export function RoutineSection({
  workouts,
  sessions,
  onChanged,
  onRemoved,
  onLogToday,
}: {
  workouts: Workout[];
  sessions: WorkoutSession[];
  onChanged: () => Promise<void>;
  onRemoved: (id: number) => void;
  onLogToday: (workout: Workout) => void;
}) {
  const [editing, setEditing] = useState<Workout | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const today = todayKey();
  const loggedToday = new Set(sessions.filter((s) => s.date === today).map((s) => s.workout));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const workoutType = textOrNull(data.get("workoutType"));
    if (!workoutType) {
      toast.error("Please add a workout type");
      return;
    }

    const row = {
      workout_type: workoutType,
      preferred_day: textOrNull(data.get("preferredDay")),
      preferred_time: textOrNull(data.get("preferredTime")),
      notes: textOrNull(data.get("notes")),
    };

    setSaving(true);
    const { error } = editing
      ? await supabase.from("workouts").update(row).eq("id", editing.id)
      : await supabase.from("workouts").insert(row);
    setSaving(false);

    if (error) {
      toast.error(editing ? "Couldn't update workout" : "Couldn't save workout", {
        description: error.message,
      });
      return;
    }

    toast.success(editing ? "Workout updated" : "Workout added to your routine");
    form.reset();
    setEditing(null);
    await onChanged();
  }

  async function handleDelete(workout: Workout) {
    if (!window.confirm(`Delete "${workout.workout_type}" from your routine?`)) return;

    setDeletingId(workout.id);
    const { error } = await supabase.from("workouts").delete().eq("id", workout.id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete workout", { description: error.message });
      return;
    }
    if (editing?.id === workout.id) setEditing(null);
    onRemoved(workout.id);
    toast.success("Workout deleted");
  }

  // Today's workouts first, then the rest in the order they were added.
  const sorted = [...workouts].sort(
    (a, b) =>
      Number(parseDays(b.preferred_day).includes(todayIndex())) -
      Number(parseDays(a.preferred_day).includes(todayIndex())),
  );

  return (
    <div>
      <SectionIntro eyebrow="Plan your week" title="Weekly Routine">
        Add the workouts you want to do each week. Workouts with a day and time also appear
        on your weekly Schedule.
      </SectionIntro>

      <form
        id="workout-form"
        key={editing?.id ?? "new"}
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-muted/20 p-5"
      >
        <h3 className="font-semibold">{editing ? "Edit Workout" : "Add a Workout"}</h3>

        <label className="block text-sm font-medium">
          Workout <span className="text-destructive">*</span>
          <input
            name="workoutType"
            required
            maxLength={100}
            defaultValue={editing?.workout_type ?? ""}
            placeholder="e.g. Leg day, 5K run, Yoga"
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Days
            <input
              name="preferredDay"
              defaultValue={editing?.preferred_day ?? ""}
              placeholder="e.g. Mon/Wed/Fri or weekends"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Time
            <input
              name="preferredTime"
              type="time"
              defaultValue={editing?.preferred_time?.slice(0, 5) ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Notes
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={editing?.notes ?? ""}
            placeholder="Exercises, sets and reps, equipment..."
            className={`${inputClass} resize-y`}
          />
        </label>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          {editing && (
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Workout" : "Save Workout"}
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Your Routine</h3>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {workouts.length} {workouts.length === 1 ? "workout" : "workouts"} planned
        </p>

        {workouts.length === 0 ? (
          <EmptyState icon="🏃" title="No workouts planned yet">
            Add your first workout to start building a routine.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sorted.map((workout) => {
              const isToday = parseDays(workout.preferred_day).includes(todayIndex());
              const done = loggedToday.has(workout.workout_type);
              return (
                <li
                  key={workout.id}
                  className={`flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm ${
                    isToday ? "border-emerald-300 bg-emerald-50/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="break-words font-semibold">{workout.workout_type}</h4>
                    {isToday && <Chip className="bg-emerald-100 text-emerald-800">Today</Chip>}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {workout.preferred_day && (
                      <Chip className="bg-blue-50 text-blue-700">📅 {workout.preferred_day}</Chip>
                    )}
                    {workout.preferred_time && (
                      <Chip className="bg-emerald-50 text-emerald-700">
                        🕒 {formatClock(workout.preferred_time)}
                      </Chip>
                    )}
                    {!workout.preferred_day && !workout.preferred_time && (
                      <span className="text-xs text-muted-foreground">No day or time set</span>
                    )}
                  </div>

                  {workout.notes && (
                    <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                      {workout.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      disabled={done}
                      onClick={() => onLogToday(workout)}
                    >
                      {done ? "✓ Done today" : "✓ Log today"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(workout);
                        document.getElementById("workout-form")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === workout.id}
                      onClick={() => handleDelete(workout)}
                    >
                      {deletingId === workout.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Log */

export function LogSection({
  workouts,
  sessions,
  onLog,
  onUpdate,
  onDelete,
}: {
  workouts: Workout[];
  sessions: WorkoutSession[];
  onLog: (session: Omit<WorkoutSession, "id">) => Promise<WorkoutSession | null>;
  onUpdate: (id: string, changes: Omit<WorkoutSession, "id">) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const workout = textOrNull(data.get("workout"));
    const date = textOrNull(data.get("date"));
    if (!workout || !date) {
      toast.error("Please add a workout and date");
      return;
    }

    const minutes = Math.round(Number(data.get("minutes")));
    const intensity = data.get("intensity");
    const entry = {
      date,
      workout,
      minutes: minutes > 0 ? minutes : null,
      intensity: isIntensity(intensity) ? intensity : "moderate",
      notes: textOrNull(data.get("notes")) ?? "",
    };

    setSaving(true);
    const ok = editing ? await onUpdate(editing.id, entry) : (await onLog(entry)) !== null;
    setSaving(false);
    if (!ok) return;
    toast.success(editing ? "Session updated" : "Session logged");
    form.reset();
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this session from your log?")) return;
    if (!(await onDelete(id))) return;
    if (editing?.id === id) setEditing(null);
    toast.success("Session deleted");
  }

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <SectionIntro eyebrow="Track what you did" title="Workout Log">
        Record each session you finish.
      </SectionIntro>

      <form
        id="log-form"
        key={editing?.id ?? "new"}
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-muted/20 p-5"
      >
        <h3 className="font-semibold">{editing ? "Edit Session" : "Log a Session"}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Workout <span className="text-destructive">*</span>
            <input
              name="workout"
              required
              list="routine-workouts"
              maxLength={100}
              defaultValue={editing?.workout ?? ""}
              placeholder="Pick from your routine or type one"
              className={inputClass}
            />
            <datalist id="routine-workouts">
              {workouts.map((w) => (
                <option key={w.id} value={w.workout_type} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm font-medium">
            Date <span className="text-destructive">*</span>
            <input
              name="date"
              type="date"
              required
              max={todayKey()}
              defaultValue={editing?.date ?? todayKey()}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Duration (minutes)
            <input
              name="minutes"
              type="number"
              min={1}
              max={600}
              defaultValue={editing?.minutes ?? ""}
              placeholder="e.g. 45"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Intensity
            <select
              name="intensity"
              defaultValue={editing?.intensity ?? "moderate"}
              className={inputClass}
            >
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Notes
          <textarea
            name="notes"
            rows={2}
            maxLength={1000}
            defaultValue={editing?.notes ?? ""}
            placeholder="Weights, distance, how you felt..."
            className={`${inputClass} resize-y`}
          />
        </label>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          {editing && (
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Session" : "Log Session"}
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Recent Sessions</h3>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"} logged
        </p>

        {sessions.length === 0 ? (
          <EmptyState icon="📒" title="Nothing logged yet">
            Log a session here, or hit “Log today” on a workout in your routine.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {sorted.map((s) => (
              <li key={s.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words font-semibold">{s.workout}</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip className="bg-blue-50 text-blue-700">📅 {formatDate(s.date)}</Chip>
                      {s.minutes && (
                        <Chip className="bg-emerald-50 text-emerald-700">⏱️ {s.minutes} min</Chip>
                      )}
                      <Chip className={intensityStyles[s.intensity]}>
                        {s.intensity[0].toUpperCase() + s.intensity.slice(1)}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(s);
                        document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Edit
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {s.notes && (
                  <p className="mt-3 whitespace-pre-wrap break-words border-t pt-3 text-sm text-muted-foreground">
                    {s.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Progress */

function longestStreak(dates: string[]) {
  const unique = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of unique) {
    const next = previous ? toDateKey(addDays(new Date(`${previous}T00:00:00`), 1)) : null;
    run = date === next ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

export function ProgressSection({
  sessions,
  weeklyGoal,
  setWeeklyGoal,
  streak,
}: {
  sessions: WorkoutSession[];
  weeklyGoal: number;
  setWeeklyGoal: (goal: number) => void;
  streak: number;
}) {
  // Session counts for this week and the 7 before it, oldest first.
  const thisMonday = startOfWeek(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(thisMonday, (i - 7) * 7);
    const from = toDateKey(start);
    const to = toDateKey(addDays(start, 6));
    const count = sessions.filter((s) => s.date >= from && s.date <= to).length;
    return { from, label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count };
  });
  const thisWeek = weeks[weeks.length - 1].count;
  const scaleMax = Math.max(weeklyGoal, ...weeks.map((w) => w.count), 1);
  const percent = Math.min(100, Math.round((thisWeek / weeklyGoal) * 100));

  // Which days of the week this week already have a session.
  const weekDates = days.map((_, i) => toDateKey(addDays(thisMonday, i)));
  const loggedDates = new Set(sessions.map((s) => s.date));
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  return (
    <div>
      <SectionIntro eyebrow="Stay consistent" title="Progress">
        Set a weekly target and see how your last few weeks compare.
      </SectionIntro>

      <div className="rounded-xl border bg-muted/20 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="block text-sm font-medium">
            Weekly goal (sessions)
            <input
              type="number"
              min={1}
              max={14}
              value={weeklyGoal}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 1 && value <= 14) setWeeklyGoal(value);
              }}
              className={`${inputClass} w-32`}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {thisWeek >= weeklyGoal
              ? "🎉 Goal reached this week!"
              : `${weeklyGoal - thisWeek} more to hit your goal this week`}
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const done = loggedDates.has(weekDates[i]);
            return (
              <div
                key={day}
                className={`rounded-lg border py-2 text-center text-xs font-medium ${
                  done ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "text-muted-foreground"
                } ${i === todayIndex() ? "ring-2 ring-primary/40" : ""}`}
              >
                {day.slice(0, 3)}
                <div className="mt-1 text-base">{done ? "✓" : "·"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Current streak</p>
          <p className="mt-1 text-2xl font-bold">🔥 {streak}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Longest streak</p>
          <p className="mt-1 text-2xl font-bold">🏆 {longestStreak(sessions.map((s) => s.date))}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">All-time minutes</p>
          <p className="mt-1 text-2xl font-bold">⏱️ {totalMinutes}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-5">
        <h3 className="font-semibold">Last 8 weeks</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sessions per week · dashed line is your goal
        </p>
        <div className="relative mt-4 flex h-40 items-end gap-2">
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-emerald-500"
            style={{ bottom: `${(weeklyGoal / scaleMax) * 100}%` }}
          />
          {weeks.map((week) => (
            <div key={week.from} className="flex h-full flex-1 items-end">
              <div
                title={`${week.count} ${week.count === 1 ? "session" : "sessions"}`}
                className={`w-full rounded-t-md ${week.count >= weeklyGoal ? "bg-emerald-500" : "bg-emerald-200"}`}
                style={{ height: `${(week.count / scaleMax) * 100}%`, minHeight: week.count ? 4 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {weeks.map((week) => (
            <span key={week.from} className="flex-1 text-center text-[10px] text-muted-foreground">
              <span className="block text-xs font-semibold text-foreground">{week.count}</span>
              {week.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
