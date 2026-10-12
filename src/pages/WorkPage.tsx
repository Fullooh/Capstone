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

// Postgres returns times as "HH:MM:SS"; show them as "9:00 AM".
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

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadJobs() {
    const { data, error } = await supabase
      .from("work_info")
      .select("id, job, work_days, start_time, end_time, priority, notes")
      .order("created_at", { ascending: true });

    if (error) toast.error("Couldn't load work info", { description: error.message });
    else setJobs(data);
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
      toast.error("Couldn't save work info", { description: error.message });
      return;
    }

    form.reset();
    toast.success("Work information saved");
    loadJobs();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("work_info").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete job", { description: error.message });
      return;
    }

    setJobs((current) => current.filter((job) => job.id !== id));
    toast.success("Job deleted");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Work</h1>
        <p className="mt-2 text-muted-foreground">
          Add your work schedule and availability.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border bg-card p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold">Work Information</h2>

        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="job" className="text-sm font-medium">
              Job / Workplace
            </label>
            <input
              id="job"
              name="job"
              required
              placeholder="Example: Part-time job"
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="workDays" className="text-sm font-medium">
              Work Days
            </label>
            <input
              id="workDays"
              name="workDays"
              placeholder="Example: Monday, Wednesday, Friday"
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="workStart" className="text-sm font-medium">
                Start Time
              </label>
              <input
                id="workStart"
                name="startTime"
                type="time"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
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
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="workPriority" className="text-sm font-medium">
              Work Priority
            </label>
            <select
              id="workPriority"
              name="priority"
              defaultValue="medium"
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="workNotes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="workNotes"
              name="notes"
              rows={5}
              placeholder="Add work-related information..."
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Work Information"}
          </Button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Your Jobs</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No jobs yet. Add one above.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-lg border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words">{job.job}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.work_days || "No days set"}
                      {job.start_time && (
                        <>
                          {" · "}
                          {formatTime(job.start_time)}
                          {job.end_time && ` – ${formatTime(job.end_time)}`}
                        </>
                      )}
                      {job.priority && (
                        <>
                          {" · "}
                          <span className="capitalize">{job.priority}</span>{" "}
                          priority
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === job.id}
                    onClick={() => handleDelete(job.id)}
                  >
                    {deletingId === job.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                {job.notes && (
                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                    {job.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
