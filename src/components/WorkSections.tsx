import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { parseDays, startOfWeek, toDateKey, toHours } from "@/lib/schedule";
import { formatClock, formatDate, textOrNull, todayKey } from "@/lib/page-utils";
import { Chip, EmptyState, SectionIntro, inputClass } from "@/components/FolderPage";

export type Priority = "low" | "medium" | "high";

export type Job = {
  id: number;
  job: string;
  work_days: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: string | null;
  notes: string | null;
};

export type Shift = {
  id: string;
  date: string; // YYYY-MM-DD
  job: string;
  hours: number;
  rate: number | null; // $/hour
  notes: string;
};

export type WorkTask = {
  id: string;
  title: string;
  job: string | null;
  due: string | null;
  priority: Priority;
  done: boolean;
};

const priorityStyles: Record<string, string> = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

const money = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD" });

const hoursLabel = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;

// Length of one shift in hours (handles overnight shifts), or null if times are missing.
export function shiftLength(job: Job) {
  const start = toHours(job.start_time);
  const end = toHours(job.end_time);
  if (start === null || end === null) return null;
  return end > start ? end - start : end + 24 - start;
}

// Regular hours per week: shift length × number of work days.
export function weeklyHours(job: Job) {
  const length = shiftLength(job);
  const dayCount = parseDays(job.work_days).length;
  return length === null || dayCount === 0 ? null : length * dayCount;
}

function JobSelect({ jobs, name, defaultValue, required }: {
  jobs: Job[];
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <select name={name} required={required} defaultValue={defaultValue} className={inputClass}>
      <option value="">{required ? "Choose a job" : "No specific job"}</option>
      {jobs.map((job) => (
        <option key={job.id} value={job.job}>{job.job}</option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------- Jobs */

export function JobsSection({
  jobs,
  onChanged,
  onRemoved,
}: {
  jobs: Job[];
  onChanged: () => Promise<void>;
  onRemoved: (id: number) => void;
}) {
  const [editing, setEditing] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const job = textOrNull(data.get("job"));
    if (!job) {
      toast.error("Please add a job or workplace");
      return;
    }

    const row = {
      job,
      work_days: textOrNull(data.get("workDays")),
      start_time: textOrNull(data.get("startTime")),
      end_time: textOrNull(data.get("endTime")),
      priority: textOrNull(data.get("priority")),
      notes: textOrNull(data.get("notes")),
    };

    setSaving(true);
    const { error } = editing
      ? await supabase.from("work_info").update(row).eq("id", editing.id)
      : await supabase.from("work_info").insert(row);
    setSaving(false);

    if (error) {
      toast.error(editing ? "Couldn't update job" : "Couldn't save job", { description: error.message });
      return;
    }

    toast.success(editing ? "Job updated" : "Job added");
    form.reset();
    setEditing(null);
    await onChanged();
  }

  async function handleDelete(job: Job) {
    if (!window.confirm(`Delete "${job.job}"?`)) return;

    setDeletingId(job.id);
    const { error } = await supabase.from("work_info").delete().eq("id", job.id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete job", { description: error.message });
      return;
    }
    if (editing?.id === job.id) setEditing(null);
    onRemoved(job.id);
    toast.success("Job deleted");
  }

  return (
    <div>
      <SectionIntro eyebrow="Your regular hours" title="Jobs & Shifts">
        Add each job with the days and hours you usually work. Jobs with days and times also
        appear on your weekly Schedule, so the optimizer plans around them.
      </SectionIntro>

      <form
        id="job-form"
        key={editing?.id ?? "new"}
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-muted/20 p-5"
      >
        <h3 className="font-semibold">{editing ? "Edit Job" : "Add a Job"}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Job or Workplace <span className="text-destructive">*</span>
            <input
              name="job"
              required
              maxLength={100}
              defaultValue={editing?.job ?? ""}
              placeholder="e.g. Barista at Blue Bottle"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Priority
            <select name="priority" defaultValue={editing?.priority ?? "medium"} className={inputClass}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Work Days
            <input
              name="workDays"
              defaultValue={editing?.work_days ?? ""}
              placeholder="e.g. Mon-Fri or Sat/Sun"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Start Time
            <input
              name="startTime"
              type="time"
              defaultValue={editing?.start_time?.slice(0, 5) ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            End Time
            <input
              name="endTime"
              type="time"
              defaultValue={editing?.end_time?.slice(0, 5) ?? ""}
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
            placeholder="Manager contact, location, responsibilities..."
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
            {saving ? "Saving..." : editing ? "Update Job" : "Save Job"}
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Your Jobs</h3>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"} in your work folder
        </p>

        {jobs.length === 0 ? (
          <EmptyState icon="💼" title="No jobs yet">
            Add your first job so your work hours show up on your Schedule.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {[...jobs]
              .sort((a, b) => (priorityRank[a.priority ?? ""] ?? 3) - (priorityRank[b.priority ?? ""] ?? 3))
              .map((job) => {
                const perWeek = weeklyHours(job);
                return (
                  <li key={job.id} className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="break-words font-semibold">{job.job}</h4>
                      {job.priority && (
                        <Chip className={priorityStyles[job.priority]}>
                          {job.priority[0].toUpperCase() + job.priority.slice(1)}
                        </Chip>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {job.work_days && <Chip className="bg-blue-50 text-blue-700">📅 {job.work_days}</Chip>}
                      {job.start_time && (
                        <Chip className="bg-amber-50 text-amber-700">
                          🕒 {formatClock(job.start_time)}
                          {job.end_time && ` – ${formatClock(job.end_time)}`}
                        </Chip>
                      )}
                      {perWeek !== null && (
                        <Chip className="bg-emerald-50 text-emerald-700">⏱️ {hoursLabel(perWeek)}/week</Chip>
                      )}
                      {!job.work_days && !job.start_time && (
                        <span className="text-xs text-muted-foreground">No regular schedule set</span>
                      )}
                    </div>

                    {job.notes && (
                      <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                        {job.notes}
                      </p>
                    )}

                    <div className="mt-4 flex justify-end gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(job);
                          document.getElementById("job-form")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deletingId === job.id}
                        onClick={() => handleDelete(job)}
                      >
                        {deletingId === job.id ? "Deleting..." : "Delete"}
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

/* ------------------------------------------------------------------ Hours */

export function HoursSection({
  jobs,
  shifts,
  setShifts,
}: {
  jobs: Job[];
  shifts: Shift[];
  setShifts: Dispatch<SetStateAction<Shift[]>>;
}) {
  const sorted = [...shifts].sort((a, b) => b.date.localeCompare(a.date));
  const lastRate = sorted.find((s) => s.rate !== null)?.rate ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const job = textOrNull(data.get("job"));
    const date = textOrNull(data.get("date"));
    const hours = Number(data.get("hours"));
    const rate = Number(data.get("rate"));
    if (!job || !date || !(hours > 0)) {
      toast.error("Please choose a job, date and hours worked");
      return;
    }

    setShifts((current) => [
      {
        id: crypto.randomUUID(),
        date,
        job,
        hours,
        rate: rate > 0 ? rate : null,
        notes: textOrNull(data.get("notes")) ?? "",
      },
      ...current,
    ]);
    form.reset();
    toast.success("Hours logged");
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    setShifts((current) => current.filter((s) => s.id !== id));
    toast.success("Entry deleted");
  }

  const weekStart = toDateKey(startOfWeek(new Date()));
  const monthStart = todayKey().slice(0, 8) + "01";
  const sum = (list: Shift[], pick: (s: Shift) => number) => list.reduce((t, s) => t + pick(s), 0);
  const week = shifts.filter((s) => s.date >= weekStart);
  const month = shifts.filter((s) => s.date >= monthStart);
  const pay = (s: Shift) => s.hours * (s.rate ?? 0);

  const summary = [
    { label: "Hours this week", value: hoursLabel(sum(week, (s) => s.hours)) },
    { label: "Earned this week", value: money(sum(week, pay)) },
    { label: "Hours this month", value: hoursLabel(sum(month, (s) => s.hours)) },
    { label: "Earned this month", value: money(sum(month, pay)) },
  ];

  return (
    <div>
      <SectionIntro eyebrow="Track your time" title="Hours Log">
        Log the hours you actually worked and an optional hourly rate to estimate your pay.
        Your log is saved in this browser.
      </SectionIntro>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState icon="⏱️" title="Add a job first">
          Hours are logged against a job. Add one in Jobs & Shifts to get started.
        </EmptyState>
      ) : (
        <form
          key={shifts.length}
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border bg-muted/20 p-5"
        >
          <h3 className="font-semibold">Log Hours</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-medium">
              Job <span className="text-destructive">*</span>
              <JobSelect jobs={jobs} name="job" required defaultValue={jobs.length === 1 ? jobs[0].job : ""} />
            </label>
            <label className="block text-sm font-medium">
              Date <span className="text-destructive">*</span>
              <input name="date" type="date" required max={todayKey()} defaultValue={todayKey()} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Hours <span className="text-destructive">*</span>
              <input name="hours" type="number" required min={0.25} max={24} step={0.25} placeholder="e.g. 6.5" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Rate ($/hr)
              <input
                name="rate"
                type="number"
                min={0}
                step={0.01}
                defaultValue={lastRate ?? ""}
                placeholder="Optional"
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Notes
            <input name="notes" maxLength={300} placeholder="Covered a shift, overtime, tips..." className={inputClass} />
          </label>
          <div className="flex justify-end border-t pt-4">
            <Button type="submit">Log Hours</Button>
          </div>
        </form>
      )}

      <div className="mt-8">
        <h3 className="mb-4 text-lg font-semibold">Recent Entries</h3>
        {shifts.length === 0 ? (
          <EmptyState icon="📒" title="No hours logged yet">
            Entries you log will show up here.
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-xl border">
            {sorted.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="break-words font-medium">{s.job}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(s.date)} · {hoursLabel(s.hours)}
                    {s.rate !== null && ` · ${money(pay(s))}`}
                    {s.notes && ` · ${s.notes}`}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Tasks */

type TaskFilter = "open" | "done" | "all";

export function TasksSection({
  jobs,
  tasks,
  setTasks,
}: {
  jobs: Job[];
  tasks: WorkTask[];
  setTasks: Dispatch<SetStateAction<WorkTask[]>>;
}) {
  const [filter, setFilter] = useState<TaskFilter>("open");
  const today = todayKey();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = textOrNull(data.get("title"));
    if (!title) {
      toast.error("Please describe the task");
      return;
    }
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title,
        job: textOrNull(data.get("job")),
        due: textOrNull(data.get("due")),
        priority: (data.get("priority") as Priority) ?? "medium",
        done: false,
      },
      ...current,
    ]);
    form.reset();
    toast.success("Task added");
  }

  const toggle = (id: string) =>
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) => setTasks((current) => current.filter((t) => t.id !== id));

  // Open tasks first, then by due date (no date last), then priority.
  const visible = tasks
    .filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done))
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
        priorityRank[a.priority] - priorityRank[b.priority],
    );

  const counts = {
    open: tasks.filter((t) => !t.done).length,
    done: tasks.filter((t) => t.done).length,
    all: tasks.length,
  };

  return (
    <div>
      <SectionIntro eyebrow="Stay on top of it" title="Work Tasks">
        Keep track of reports, trainings, emails and other work to-dos. Tasks are saved in
        this browser.
      </SectionIntro>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-muted/20 p-5">
        <h3 className="font-semibold">Add a Task</h3>
        <label className="block text-sm font-medium">
          Task <span className="text-destructive">*</span>
          <input name="title" required maxLength={200} placeholder="e.g. Submit timesheet" className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Job
            <JobSelect jobs={jobs} name="job" defaultValue="" />
          </label>
          <label className="block text-sm font-medium">
            Due Date
            <input name="due" type="date" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Priority
            <select name="priority" defaultValue="medium" className={inputClass}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end border-t pt-4">
          <Button type="submit">Add Task</Button>
        </div>
      </form>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Your Tasks</h3>
          <div className="flex gap-1 rounded-lg border p-1">
            {(["open", "done", "all"] as TaskFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="✅" title={filter === "done" ? "Nothing completed yet" : "You're all caught up"}>
            {filter === "done" ? "Tasks you check off will show up here." : "Add a task above when something comes up."}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {visible.map((task) => {
              const overdue = !task.done && task.due !== null && task.due < today;
              return (
                <li
                  key={task.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${overdue ? "border-rose-300 bg-rose-50/40" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggle(task.id)}
                    aria-label={`Mark "${task.title}" as ${task.done ? "not done" : "done"}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`break-words font-medium ${task.done ? "text-muted-foreground line-through" : ""}`}>
                      {task.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip className={priorityStyles[task.priority]}>
                        {task.priority[0].toUpperCase() + task.priority.slice(1)}
                      </Chip>
                      {task.job && <Chip className="bg-amber-50 text-amber-700">💼 {task.job}</Chip>}
                      {task.due && (
                        <Chip className={overdue ? "bg-rose-100 text-rose-800" : "bg-blue-50 text-blue-700"}>
                          {overdue ? "⚠️ Overdue · " : task.due === today ? "Due today · " : "📅 "}
                          {formatDate(task.due)}
                        </Chip>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(task.id)}>
                    Delete
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
