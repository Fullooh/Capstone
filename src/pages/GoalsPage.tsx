import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "@/lib/router";
import { useRequireUser } from "@/lib/page-utils";
import { Button } from "@/components/ui/button";

type Goal = {
  id: number;
  goal: string;
  priority: "low" | "medium" | "high" | null;
  deadline: string | null;
  notes: string | null;
  progress: number; // 0-100, 100 = completed
  created_at: string;
};

type Section = "goals" | "achievements";

const GOAL_COLUMNS = "id, goal, priority, deadline, notes, progress, created_at";
const DAY_MS = 24 * 60 * 60 * 1000;
const PROGRESS_SAVE_DELAY_MS = 400; // wait for the slider to settle before saving

// Goals were briefly kept only in this browser under this key (2026-11-17).
// On first load they're copied into the goals table, then removed from the browser.
const LEGACY_STORAGE_KEY = "my-schedule-360-goals";

function clampProgress(value: unknown) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

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

// One import at a time (React runs effects twice in dev).
let legacyImport: Promise<void> | null = null;

function importLegacyGoals() {
  if (legacyImport) return legacyImport;

  legacyImport = (async () => {
    let stored: unknown;
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      stored = JSON.parse(raw);
    } catch {
      return; // unreadable / storage blocked: nothing to import
    }

    const list = Array.isArray(stored) ? stored : [];
    const rows = list.flatMap((entry) => {
      const old = (entry ?? {}) as Record<string, unknown>;
      const goal = typeof old.goal === "string" ? old.goal.trim() : "";
      if (!goal) return [];

      const priority =
        old.priority === "low" || old.priority === "medium" || old.priority === "high"
          ? old.priority
          : null;
      const deadline =
        typeof old.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(old.deadline)
          ? old.deadline
          : null;
      const notes = typeof old.notes === "string" && old.notes.trim() ? old.notes.trim() : null;
      const createdAt =
        typeof old.created_at === "string" && !Number.isNaN(Date.parse(old.created_at))
          ? old.created_at
          : undefined;

      return [{ goal, priority, deadline, notes, progress: clampProgress(old.progress), created_at: createdAt }];
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("goals").insert(rows);
      if (error) throw error;
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY);
  })().finally(() => {
    legacyImport = null;
  });

  return legacyImport;
}

export function GoalsPage() {
  const userId = useRequireUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("goals");

  // Progress changes waiting to be saved, by goal id.
  const pendingProgress = useRef(new Map<number, { timer: number; progress: number }>());

  async function loadGoals() {
    const { data, error } = await supabase
      .from("goals")
      .select(GOAL_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Couldn't load goals", { description: error.message });
    } else {
      setGoals((data ?? []) as Goal[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        await importLegacyGoals();
      } catch (error) {
        toast.error("Couldn't move your saved goals to your account yet", {
          description: (error as { message?: string }).message ?? String(error),
        });
      }
      await loadGoals();
    })();
  }, [userId]);

  async function saveProgress(id: number, progress: number) {
    const { error } = await supabase.from("goals").update({ progress }).eq("id", id);

    if (error) {
      toast.error("Couldn't save your progress", { description: error.message });
      await loadGoals(); // show what's actually saved
    }
  }

  // Save anything still waiting when leaving the page.
  useEffect(() => {
    const pending = pendingProgress.current;
    return () => {
      pending.forEach(({ timer, progress }, id) => {
        window.clearTimeout(timer);
        void saveProgress(id, progress);
      });
      pending.clear();
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

    const { data: saved, error } = await supabase
      .from("goals")
      .insert({
        goal,
        priority: priority || null,
        deadline,
        notes: notes || null,
      })
      .select(GOAL_COLUMNS)
      .single();

    setSaving(false);

    if (error) {
      toast.error("Couldn't save goal", { description: error.message });
      return;
    }

    setGoals((current) => [saved as Goal, ...current]);
    form.reset();
    toast.success("Goal added successfully");
  }

  // Shows the new value right away; saves once the slider stops moving.
  function updateProgress(id: number, progress: number) {
    const newProgress = clampProgress(progress);
    const before = goals.find((goal) => goal.id === id);
    if (!before || before.progress === newProgress) return;

    setGoals((current) =>
      current.map((goal) =>
        goal.id === id ? { ...goal, progress: newProgress } : goal
      )
    );

    if (newProgress === 100) {
      toast.success("Goal completed! Congratulations! 🎉");
    }

    const pending = pendingProgress.current;
    const waiting = pending.get(id);
    if (waiting) window.clearTimeout(waiting.timer);

    const timer = window.setTimeout(() => {
      pending.delete(id);
      void saveProgress(id, newProgress);
    }, PROGRESS_SAVE_DELAY_MS);

    pending.set(id, { timer, progress: newProgress });
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const waiting = pendingProgress.current.get(id);
    if (waiting) {
      window.clearTimeout(waiting.timer);
      pendingProgress.current.delete(id);
    }

    const { error } = await supabase.from("goals").delete().eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete goal", { description: error.message });
      return;
    }

    setGoals((current) => current.filter((goal) => goal.id !== id));
    toast.success("Goal deleted");
  }

  const activeGoals = goals.filter((goal) => goal.progress < 100);
  const completedGoals = goals.filter((goal) => goal.progress === 100);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueThisWeek = activeGoals.filter((goal) => {
    if (!goal.deadline) return false;

    const daysLeft =
      (deadlineDate(goal.deadline).getTime() - today.getTime()) / DAY_MS;

    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const stats = [
    {
      label: "Active Goals",
      value: activeGoals.length,
      icon: "🎯",
      color: "bg-blue-50 text-blue-700",
      description: "Goals you're working toward",
    },
    {
      label: "Completed",
      value: completedGoals.length,
      icon: "🏆",
      color: "bg-emerald-50 text-emerald-700",
      description: "Goals you've accomplished",
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <header className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
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
                  Set your goals, track your progress, and celebrate what you
                  accomplish along the way.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/schedule"
                className="inline-flex items-center justify-center gap-2 rounded-lg border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                📅 Schedule
              </Link>

              {activeSection === "goals" && (
                <a
                  href="#goal-form"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  + Add Goal
                </a>
              )}
            </div>
          </div>
        </header>

        <section className="mt-8" aria-label="Goals summary">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Goal Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick look at your progress and achievements.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
          <aside className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Goal Navigation
            </p>

            <nav className="flex gap-2 lg:flex-col" aria-label="Goal sections">
              <button
                type="button"
                onClick={() => setActiveSection("goals")}
                className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition lg:flex-none ${
                  activeSection === "goals"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>🎯</span>
                <span>My Goals</span>
                <span className="ml-auto text-xs">{activeGoals.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("achievements")}
                className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition lg:flex-none ${
                  activeSection === "achievements"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>🏆</span>
                <span>Achievements</span>
                <span className="ml-auto text-xs">
                  {completedGoals.length}
                </span>
              </button>
            </nav>
          </aside>

          <div className="min-w-0">
            {activeSection === "goals" ? (
              <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
                <section
                  id="goal-form"
                  className="scroll-mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                    Set a Target
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Goal Information</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Describe your goal, its priority, and when you want to
                    achieve it.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="goal" className="text-sm font-medium">
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
                      <label htmlFor="priority" className="text-sm font-medium">
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
                      <label htmlFor="deadline" className="text-sm font-medium">
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
                      <label htmlFor="notes" className="text-sm font-medium">
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
                      <h2 className="text-lg font-semibold">My Goals</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Update your progress as you work toward each goal.
                      </p>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {activeGoals.length} active
                    </p>
                  </div>

                  {loading ? (
                    <div className="mt-5 rounded-2xl border bg-card p-10 text-center">
                      <p className="font-medium">Loading your goals...</p>
                    </div>
                  ) : activeGoals.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
                        ✨
                      </div>
                      <h3 className="mt-4 text-lg font-semibold">
                        No active goals yet
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        Add your first goal to start tracking your progress.
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
                      {activeGoals.map((goal) => (
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
                              </div>
                            </div>
                          </div>

                          {goal.notes && (
                            <p className="mt-4 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                              {goal.notes}
                            </p>
                          )}

                          <div className="mt-5 border-t pt-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold">
                                Progress
                              </span>
                              <span className="text-sm font-bold text-primary tabular-nums">
                                {goal.progress}%
                              </span>
                            </div>

                            <div
                              className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-label={`Progress for ${goal.goal}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={goal.progress}
                            >
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>

                            <div className="mt-4">
                              <label
                                htmlFor={`progress-${goal.id}`}
                                className="mb-2 block text-xs font-medium text-muted-foreground"
                              >
                                Update completion percentage
                              </label>
                              <input
                                id={`progress-${goal.id}`}
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={goal.progress}
                                onChange={(event) =>
                                  updateProgress(
                                    goal.id,
                                    Number(event.target.value)
                                  )
                                }
                                className="w-full cursor-pointer accent-primary"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-700">
                                ⏳ In Progress
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={deletingId === goal.id}
                                onClick={() => handleDelete(goal.id)}
                              >
                                {deletingId === goal.id ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : (
              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    🏆
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Your Achievements</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A record of the goals you've successfully completed.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <p className="mt-8 text-center text-sm text-muted-foreground">
                    Loading achievements...
                  </p>
                ) : completedGoals.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="text-4xl">🌟</div>
                    <h3 className="mt-4 font-semibold">
                      Your achievements will appear here
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      When you reach 100% on a goal, it will automatically
                      appear in this section.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-5"
                      onClick={() => setActiveSection("goals")}
                    >
                      Back to My Goals
                    </Button>
                  </div>
                ) : (
                  <ul className="mt-6 grid gap-3">
                    {completedGoals.map((goal) => (
                      <li
                        key={goal.id}
                        className="rounded-xl border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="text-2xl">🏆</span>
                            <div className="min-w-0">
                              <h3 className="break-words font-semibold">
                                {goal.goal}
                              </h3>
                              {goal.deadline && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Target date: {formatDeadline(goal.deadline)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            ✓ Completed
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-full rounded-full bg-emerald-500" />
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateProgress(goal.id, 95)}
                          >
                            Reopen Goal
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deletingId === goal.id}
                            onClick={() => handleDelete(goal.id)}
                          >
                            {deletingId === goal.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </div>

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
