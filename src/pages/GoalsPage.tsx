import { useEffect, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

type Goal = {
  id: number;
  goal: string;
  priority: "low" | "medium" | "high" | null;
  deadline: string | null;
  notes: string | null;
  created_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "T00:00" reads the date as local time so it doesn't show a day early.
function deadlineDate(deadline: string) {
  return new Date(deadline + "T00:00");
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadGoals() {
    const { data, error } = await supabase
      .from("goals")
      .select("id, goal, priority, deadline, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Couldn't load goals", {
        description: error.message,
      });
    } else {
      setGoals(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }

      loadGoals();
    });
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const goal = (data.get("goal") as string).trim();
    // no priority picked -> the disabled placeholder isn't submitted, so get() returns null
    const priority = (data.get("priority") as string | null) || null;
    // an empty date input sends "", which a date column rejects
    const deadline = (data.get("deadline") as string) || null;
    const notes = (data.get("notes") as string).trim();

    if (!goal) {
      toast.error("Please enter a goal");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("goals")
      .insert({ goal, priority, deadline, notes: notes || null });

    setSaving(false);

    if (error) {
      toast.error("Couldn't save goal", {
        description: error.message,
      });
      return;
    }

    form.reset();
    toast.success("Goal saved");
    await loadGoals();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const { error } = await supabase.from("goals").delete().eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete goal", {
        description: error.message,
      });
      return;
    }

    setGoals((current) => current.filter((g) => g.id !== id));

    toast.success("Goal deleted");
  }

  const highPriorityGoals = goals.filter((g) => g.priority === "high").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueThisWeek = goals.filter((g) => {
    if (!g.deadline) return false;
    const daysLeft = (deadlineDate(g.deadline).getTime() - today.getTime()) / DAY_MS;
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const stats = [
    {
      label: "Total Goals",
      value: goals.length,
      icon: "🎯",
      description: "Goals you're working toward",
    },
    {
      label: "High Priority",
      value: highPriorityGoals,
      icon: "🔥",
      description: "Goals that come first",
    },
    {
      label: "Due This Week",
      value: dueThisWeek,
      icon: "⏰",
      description: "Deadlines in the next 7 days",
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-3xl">
              🎯
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                Your Progress
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Goals
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Set your goals, decide what matters most, and keep your
                deadlines in view so you can plan time to reach them.
              </p>
            </div>

            <a
              href="#goal-form"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              + Add Goal
            </a>
          </div>
        </header>

        <section
          aria-label="Goals summary"
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

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl">
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
          id="goal-form"
          className="mt-8 scroll-mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
              Set a target
            </p>

            <h2 className="mt-1 text-xl font-bold">Goal Information</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Describe your goal, how important it is, and when you want to
              reach it.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-xl">
                  🎯
                </div>
                <div>
                  <h3 className="font-semibold">Goal</h3>
                  <p className="text-sm text-muted-foreground">
                    What do you want to achieve?
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="goal" className="text-sm font-medium">
                  Goal <span className="text-destructive">*</span>
                </label>

                <input
                  id="goal"
                  name="goal"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="e.g. Finish my capstone project"
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl">
                  📅
                </div>
                <div>
                  <h3 className="font-semibold">Priority and Deadline</h3>
                  <p className="text-sm text-muted-foreground">
                    How important is it, and when is it due?
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="priority" className="text-sm font-medium">
                    Priority
                  </label>

                  <select
                    id="priority"
                    name="priority"
                    defaultValue=""
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="" disabled>
                      Select priority
                    </option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="deadline" className="text-sm font-medium">
                    Deadline
                  </label>

                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xl">
                  📝
                </div>
                <div>
                  <h3 className="font-semibold">Goal Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Add steps, milestones, or extra details.
                  </p>
                </div>
              </div>

              <label htmlFor="goalNotes" className="sr-only">
                Goal Notes
              </label>

              <textarea
                id="goalNotes"
                name="notes"
                rows={4}
                maxLength={2000}
                placeholder="e.g. Finish the backend by week 6, then polish the UI..."
                className="mt-5 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Button type="reset" variant="outline" disabled={saving}>
                Clear Form
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Goal"}
              </Button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                Your targets
              </p>

              <h2 className="mt-1 text-xl font-bold">Your Goals</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Track what you're working toward and remove goals you've
                finished or dropped.
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading goals..."
                : `${goals.length} ${goals.length === 1 ? "goal" : "goals"}`}
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
          ) : goals.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-5 py-12 text-center">
              <div className="text-4xl">🎯</div>
              <h3 className="mt-4 font-semibold">No goals yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add your first goal above to start planning time toward the
                things you want to achieve.
              </p>

              <a
                href="#goal-form"
                className="mt-5 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Add your first goal
              </a>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {goals.map((g) => (
                <li
                  key={g.id}
                  className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                      🎯
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">{g.goal}</h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {g.deadline && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            📅 Due {deadlineDate(g.deadline).toLocaleDateString()}
                          </span>
                        )}

                        {g.priority && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                              g.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : g.priority === "low"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {g.priority} priority
                          </span>
                        )}

                        {!g.deadline && !g.priority && (
                          <span className="text-xs text-muted-foreground">
                            No priority or deadline set
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {g.notes && (
                    <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                      {g.notes}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === g.id}
                      onClick={() => handleDelete(g.id)}
                    >
                      {deletingId === g.id ? "Deleting..." : "Delete Goal"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="py-8 text-center text-sm text-muted-foreground">
          Set the goal. Make the time. Reach it.
        </footer>
      </div>
    </main>
  );
}
