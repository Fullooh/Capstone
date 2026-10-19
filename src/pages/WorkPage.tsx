
import { useEffect, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

type WorkInfo = {
  id: number;
  job: string;
  work_days: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: string | null;
  notes: string | null;
};

function formatTime(time: string | null) {
  if (!time) return null;

  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";

  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = (value as string | null)?.trim();
  return text || null;
}

export function WorkPage() {
  const [jobs, setJobs] = useState<WorkInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadJobs() {
    const { data, error } = await supabase
      .from("work_info")
      .select("id, job, work_days, start_time, end_time, priority, notes")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Couldn't load work information", {
        description: error.message,
      });
    } else {
      setJobs(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }

      loadJobs();
    });
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const job = textOrNull(data.get("job"));

    if (!job) {
      toast.error("Please add a job or workplace");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("work_info").insert({
      job,
      work_days: textOrNull(data.get("workDays")),
      start_time: textOrNull(data.get("startTime")),
      end_time: textOrNull(data.get("endTime")),
      priority: data.get("priority") as string,
      notes: textOrNull(data.get("notes")),
    });

    setSaving(false);

    if (error) {
      toast.error("Couldn't save work information", {
        description: error.message,
      });
      return;
    }

    form.reset();
    toast.success("Work information saved");
    await loadJobs();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const { error } = await supabase
      .from("work_info")
      .delete()
      .eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete job", {
        description: error.message,
      });
      return;
    }

    setJobs((current) => current.filter((job) => job.id !== id));
    toast.success("Job deleted");
  }

  const scheduledJobs = jobs.filter(
    (job) => job.work_days || job.start_time || job.end_time
  ).length;

  const highPriorityJobs = jobs.filter(
    (job) => job.priority === "high"
  ).length;

  const stats = [
    {
      label: "Total Jobs",
      value: jobs.length,
      icon: "💼",
      description: "Workplaces in your list",
    },
    {
      label: "With Schedules",
      value: scheduledJobs,
      icon: "📅",
      description: "Jobs with availability details",
    },
    {
      label: "High Priority",
      value: highPriorityJobs,
      icon: "⭐",
      description: "Jobs marked high priority",
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <header className="mt-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
              💼
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Your Professional Life
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Work
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Organize your jobs, manage work hours, and keep your
                professional responsibilities balanced with the rest of
                your life.
              </p>
            </div>

            <a
              href="#work-form"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              + Add Job
            </a>
          </div>
        </header>

        <section
          aria-label="Work summary"
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {loading ? "—" : stat.value}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  {stat.icon}
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          ))}
        </section>

        <section
          id="work-form"
          className="mt-8 scroll-mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Plan your work
            </p>

            <h2 className="mt-1 text-xl font-bold">Work Information</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Enter your workplace, schedule, and the importance of your
              work commitments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl">
                  🏢
                </div>

                <div>
                  <h3 className="font-semibold">Job Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Identify your job or workplace.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="job" className="text-sm font-medium">
                  Job / Workplace{" "}
                  <span className="text-destructive">*</span>
                </label>

                <input
                  id="job"
                  name="job"
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Retail Assistant, Internship, Office"
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xl">
                  📅
                </div>

                <div>
                  <h3 className="font-semibold">Work Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Add the days and hours you usually work.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <label htmlFor="workDays" className="text-sm font-medium">
                    Work Days
                  </label>

                  <input
                    id="workDays"
                    name="workDays"
                    type="text"
                    maxLength={150}
                    placeholder="e.g. Monday, Wednesday, Friday"
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />

                  <p className="mt-2 text-xs text-muted-foreground">
                    You can enter one or multiple days.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="workStart" className="text-sm font-medium">
                      Start Time
                    </label>

                    <input
                      id="workStart"
                      name="startTime"
                      type="time"
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <label htmlFor="workEnd" className="text-sm font-medium">
                      End Time
                    </label>

                    <input
                      id="workEnd"
                      name="endTime"
                      type="time"
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xl">
                  ⭐
                </div>

                <div>
                  <h3 className="font-semibold">Work Priority</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how important this commitment is to you.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="workPriority" className="text-sm font-medium">
                  Priority Level
                </label>

                <select
                  id="workPriority"
                  name="priority"
                  defaultValue="medium"
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-xl">
                  📝
                </div>

                <div>
                  <h3 className="font-semibold">Additional Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Include details that will help you plan your time.
                  </p>
                </div>
              </div>

              <label htmlFor="workNotes" className="sr-only">
                Work Notes
              </label>

              <textarea
                id="workNotes"
                name="notes"
                rows={4}
                maxLength={2000}
                placeholder="e.g. Flexible shifts, upcoming deadlines, or commute information..."
                className="mt-5 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Button
                type="reset"
                variant="outline"
                disabled={saving}
              >
                Clear Form
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Work Information"}
              </Button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Your commitments
              </p>

              <h2 className="mt-1 text-xl font-bold">Your Jobs</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Review your work commitments and remove outdated entries.
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading jobs..."
                : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
            </span>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-5 py-12 text-center">
              <div className="text-4xl">💼</div>

              <h3 className="mt-4 font-semibold">No jobs added yet</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add your first job to start organizing your work hours
                and balancing your commitments.
              </p>

              <a
                href="#work-form"
                className="mt-5 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Add your first job
              </a>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      💼
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">
                        {job.job}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.work_days && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            📅 {job.work_days}
                          </span>
                        )}

                        {(job.start_time || job.end_time) && (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            🕒 {formatTime(job.start_time) || "Start not set"}
                            {" – "}
                            {formatTime(job.end_time) || "End not set"}
                          </span>
                        )}

                        {!job.work_days &&
                          !job.start_time &&
                          !job.end_time && (
                            <span className="text-xs text-muted-foreground">
                              No schedule set
                            </span>
                          )}

                        {job.priority && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              job.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : job.priority === "low"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {job.priority} priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {job.notes && (
                    <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                      {job.notes}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === job.id}
                      onClick={() => handleDelete(job.id)}
                    >
                      {deletingId === job.id ? "Deleting..." : "Delete Job"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="py-8 text-center text-sm text-muted-foreground">
          Make time for your work. Make time for your life.
        </footer>
      </div>
    </main>
  );
}
