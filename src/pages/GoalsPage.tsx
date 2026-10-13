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

    if (error) toast.error("Couldn't load goals", { description: error.message });
    else setGoals(data);
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
      toast.error("Couldn't save goal", { description: error.message });
      return;
    }

    form.reset();
    toast.success("Goal saved");
    loadGoals();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("goals").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete goal", { description: error.message });
      return;
    }

    setGoals((current) => current.filter((g) => g.id !== id));
    toast.success("Goal deleted");
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
        <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>

        <p className="mt-2 text-muted-foreground">
          Set your goals, priorities, and deadlines.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border bg-card p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold">Goal Information</h2>

        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Goal</h3>

            <div className="mt-4">
              <label htmlFor="goal" className="text-sm font-medium">
                What is your goal?
              </label>

              <input
                id="goal"
                name="goal"
                type="text"
                required
                placeholder="Example: Complete my project"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Priority and Deadline</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </label>

                <select
                  id="priority"
                  name="priority"
                  defaultValue=""
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
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
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Goal Notes</h3>

            <textarea
              name="notes"
              rows={5}
              placeholder="Add details or additional information about your goal..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Goal"}
          </Button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Your Goals</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : goals.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No goals yet. Add one above.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {goals.map((g) => (
              <li key={g.id} className="rounded-lg border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words">{g.goal}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {g.priority ?? "No"} priority
                      </span>
                      {" · "}
                      {/* "T00:00" reads the date as local time so it doesn't show a day early */}
                      {g.deadline
                        ? `Due ${new Date(g.deadline + "T00:00").toLocaleDateString()}`
                        : "No deadline"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === g.id}
                    onClick={() => handleDelete(g.id)}
                  >
                    {deletingId === g.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                {g.notes && (
                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                    {g.notes}
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
