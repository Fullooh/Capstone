import { useEffect, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

type Workout = {
  id: number;
  workout_type: string;
  preferred_day: string | null;
  preferred_time: string | null;
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

export function WorkoutPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadWorkouts() {
    const { data, error } = await supabase
      .from("workouts")
      .select("id, workout_type, preferred_day, preferred_time, notes")
      .order("created_at", { ascending: true });

    if (error) toast.error("Couldn't load workouts", { description: error.message });
    else setWorkouts(data);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }
      loadWorkouts();
    });
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const workoutType = textOrNull(data.get("workoutType"));

    if (!workoutType) {
      toast.error("Please add a workout type");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("workouts").insert({
      workout_type: workoutType,
      preferred_day: textOrNull(data.get("preferredDay")),
      preferred_time: textOrNull(data.get("preferredTime")),
      notes: textOrNull(data.get("notes")),
    });
    setSaving(false);

    if (error) {
      toast.error("Couldn't save workout", { description: error.message });
      return;
    }

    form.reset();
    toast.success("Workout saved");
    loadWorkouts();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete workout", { description: error.message });
      return;
    }

    setWorkouts((current) => current.filter((workout) => workout.id !== id));
    toast.success("Workout deleted");
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
        <h1 className="text-3xl font-semibold tracking-tight">Workout</h1>

        <p className="mt-2 text-muted-foreground">
          Manage your workout preferences, availability, and fitness priorities.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border bg-card p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold">Workout Information</h2>

        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Workout Preferences</h3>

            <div className="mt-4">
              <label htmlFor="workoutType" className="text-sm font-medium">
                Workout Type
              </label>

              <input
                id="workoutType"
                name="workoutType"
                type="text"
                required
                placeholder="Example: Running, Gym, Basketball"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Availability</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="workoutDay" className="text-sm font-medium">
                  Preferred Day
                </label>

                <input
                  id="workoutDay"
                  name="preferredDay"
                  type="text"
                  placeholder="Example: Monday"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="workoutTime" className="text-sm font-medium">
                  Preferred Time
                </label>

                <input
                  id="workoutTime"
                  name="preferredTime"
                  type="time"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Fitness Notes</h3>

            <textarea
              name="notes"
              rows={5}
              placeholder="Add your fitness goals, preferences, or other information..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Workout Information"}
          </Button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Your Workouts</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : workouts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No workouts yet. Add one above.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {workouts.map((workout) => (
              <li key={workout.id} className="rounded-lg border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words">
                      {workout.workout_type}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {workout.preferred_day || "No day set"}
                      {workout.preferred_time &&
                        ` · ${formatTime(workout.preferred_time)}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === workout.id}
                    onClick={() => handleDelete(workout.id)}
                  >
                    {deletingId === workout.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                {workout.notes && (
                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                    {workout.notes}
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
