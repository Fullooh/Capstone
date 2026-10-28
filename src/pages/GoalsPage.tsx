
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

function deadlineDate(deadline: string) {
  return new Date(`${deadline}T00:00`);
}

function formatDeadline(deadline: string) {
  return deadlineDate(deadline).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
      setGoals((data ?? []) as Goal[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (!data.session) {
        navigate("/login");
        return;
      }

      await loadGoals();
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const goal = String(data.get("goal") ?? "").trim();
    const priority = String(data.get("priority") ?? "") as
      | "low"
      | "medium"
      | "high"
      | "";
    const deadline = String(data.get("deadline") ?? "") || null;
    const notes = String(data.get("notes") ?? "").trim();

    if (!goal) {
      toast.error("Please enter a goal");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("goals").insert({
      goal,
      priority: priority || null,
      deadline,
      notes: notes || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Couldn't save goal", {
        description: error.message,
      });
      return;
    }

    form.reset();
    toast.success("Goal added successfully");
    await loadGoals();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete goal", {
        description: error.message,
      });
      return;
    }

    setGoals((current) => current.filter((goal) => goal.id !== id));
    toast.success("Goal deleted");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const highPriorityGoals = goals.filter(
    (goal) => goal.priority === "high"
  ).length;

  const dueThisWeek = goals.filter((goal) => {
    if (!goal.deadline) return false;

    const daysLeft =
      (deadlineDate(goal.deadline).getTime() - today.getTime()) / DAY_MS;

    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const stats = [
    {
      label: "Total Goals",
      value: goals.length,
      icon: "🎯",
      color: "bg-blue-50 text-blue-700",
      description: "Goals you're working toward",
    },
    {
      label: "High Priority",
      value: highPriorityGoals,
      icon: "🔥",
      color: "bg-rose-50 text-rose-700",
      description: "Goals that need extra attention",
    },
    {
      label: "Due This Week",
      value: dueThisWeek,
      icon: "📅",
      color: "bg-violet-50 text-violet-700",
      description: "Upcoming deadlines in the next 7 days",
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <header className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-3xl">
                🎯
              </div>

              <div>
                <p className="text-sm font-medium text-primary">
                  Your Progress
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  Goals
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Set your goals, focus on what matters, and keep your
                  deadlines in view as you work toward a balanced life.
                </p>
              </div>
            </div>

            <a
              href="#goal-form"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              + Add Goal
            </a>
          </div>
        </header>

        <section className="mt-8" aria-label="Goals summary">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Goal Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick look at your targets and upcoming deadlines.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight">
                      {loading ? "—" : stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          <section
            id="goal-form"
            className="scroll-mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
              Set a Target
            </p>

            <h2 className="mt-1 text-xl font-bold">Goal Information</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Describe your goal, its priority, and when you want to achieve it.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="goal"
                  className="text-sm font-medium"
                >
                  Goal Title *
                </label>

                <input
                  id="goal"
                  name="goal"
                  required
                  maxLength={150}
                  placeholder="e.g. Earn a 3.5 GPA this semester"
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="priority"
                  className="text-sm font-medium"
                >
                  Priority
                </label>

                <select
                  id="priority"
                  name="priority"
                  defaultValue=""
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Choose a priority</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="deadline"
                  className="text-sm font-medium"
                >
                  Target Deadline
                </label>

                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  min={new Date().toLocaleDateString("en-CA")}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="notes"
                  className="text-sm font-medium"
                >
                  Notes or Action Steps
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  maxLength={2000}
                  placeholder="What steps will help you reach this goal?"
                  className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saving}
              >
                {saving ? "Saving Goal..." : "Save Goal"}
              </Button>
            </form>
          </section>

          <section>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-semibold">Your Goals</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep track of what you want to accomplish.
                </p>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                {goals.length} {goals.length === 1 ? "goal" : "goals"}
              </p>
            </div>

            {loading ? (
              <div
                className="mt-5 rounded-2xl border bg-card p-10 text-center"
                role="status"
              >
                <p className="font-medium">Loading your goals...</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Retrieving your saved information.
                </p>
              </div>
            ) : goals.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
                  ✨
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  Start with your first goal
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Whether it is academic success, saving money, or spending
                  more time with friends, add a goal to start planning ahead.
                </p>

                <a
                  href="#goal-form"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Create Your First Goal
                </a>
              </div>
            ) : (
              <ul className="mt-5 grid gap-4">
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="flex min-w-0 flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                        🎯
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold">
                          {goal.goal}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {goal.deadline && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              📅 Due {formatDeadline(goal.deadline)}
                            </span>
                          )}

                          {goal.priority && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                goal.priority === "high"
                                  ? "bg-rose-50 text-rose-700"
                                  : goal.priority === "low"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {goal.priority} priority
                            </span>
                          )}

                          {!goal.deadline && !goal.priority && (
                            <span className="text-xs text-muted-foreground">
                              No priority or deadline set
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="mt-4 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                        {goal.notes}
                      </p>
                    )}

                    <div className="mt-4 flex justify-end border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deletingId === goal.id}
                        onClick={() => handleDelete(goal.id)}
                      >
                        {deletingId === goal.id
                          ? "Deleting..."
                          : "Delete Goal"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
