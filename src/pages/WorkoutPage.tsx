
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

  async function loadWorkouts() {
    const { data, error } = await supabase
      .from("workouts")
      .select("id, workout_type, preferred_day, preferred_time, notes")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Couldn't load workouts", {
        description: error.message,
      });
    } else {
      setWorkouts(data);
    }

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
      toast.error("Couldn't save workout", {
        description: error.message,
      });
      return;
    }

    form.reset();
    toast.success("Workout saved");
    await loadWorkouts();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete workout", {
        description: error.message,
      });
      return;
    }

    setWorkouts((current) =>
      current.filter((workout) => workout.id !== id)
    );

    toast.success("Workout deleted");
  }

  const scheduledWorkouts = workouts.filter(
    (workout) => workout.preferred_day || workout.preferred_time
  ).length;

  const workoutsWithNotes = workouts.filter(
    (workout) => workout.notes?.trim()
  ).length;

  const stats = [
    {
      label: "Total Workouts",
      value: workouts.length,
      icon: "🏋️",
      description: "Activities in your list",
    },
    {
      label: "Scheduled",
      value: scheduledWorkouts,
      icon: "📅",
      description: "With a preferred day or time",
    },
    {
      label: "With Notes",
      value: workoutsWithNotes,
      icon: "📝",
      description: "With extra details",
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
              🏋️
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Your Fitness Space
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Workout
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Organize your fitness activities, choose your preferred
                workout times, and keep your personal goals in view.
              </p>
            </div>

            <a
              href="#workout-form"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              + Add Workout
            </a>
          </div>
        </header>

        <section
          aria-label="Workout summary"
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

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
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
          id="workout-form"
          className="mt-8 scroll-mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Make a plan
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Workout Information
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Add an activity and the days or times that work best for you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl">
                  💪
                </div>
                <div>
                  <h3 className="font-semibold">Workout Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    What activity do you want to do?
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="workoutType"
                  className="text-sm font-medium"
                >
                  Workout Type <span className="text-destructive">*</span>
                </label>

                <input
                  id="workoutType"
                  name="workoutType"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Running, Gym, Basketball, Yoga"
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
                  <h3 className="font-semibold">Availability</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred day and time.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="workoutDay"
                    className="text-sm font-medium"
                  >
                    Preferred Day
                  </label>

                  <select
                    id="workoutDay"
                    name="preferredDay"
                    defaultValue=""
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Choose a day</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="workoutTime"
                    className="text-sm font-medium"
                  >
                    Preferred Time
                  </label>

                  <input
                    id="workoutTime"
                    name="preferredTime"
                    type="time"
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
                  <h3 className="font-semibold">Fitness Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Record your goals and any extra details.
                  </p>
                </div>
              </div>

              <label htmlFor="workoutNotes" className="sr-only">
                Fitness Notes
              </label>

              <textarea
                id="workoutNotes"
                name="notes"
                rows={4}
                maxLength={2000}
                placeholder="e.g. Improve endurance, train for 30 minutes, or focus on strength..."
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
                {saving ? "Saving..." : "Save Workout"}
              </Button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Your activity list
              </p>

              <h2 className="mt-1 text-xl font-bold">Your Workouts</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Review your activities and remove anything you no longer need.
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading workouts..."
                : `${workouts.length} ${workouts.length === 1 ? "workout" : "workouts"}`}
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
          ) : workouts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-5 py-12 text-center">
              <div className="text-4xl">🏃</div>
              <h3 className="mt-4 font-semibold">No workouts yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add your first fitness activity above to start organizing
                your workout routine.
              </p>

              <a
                href="#workout-form"
                className="mt-5 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Add your first workout
              </a>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {workouts.map((workout) => (
                <li
                  key={workout.id}
                  className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                      🏋️
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">
                        {workout.workout_type}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {workout.preferred_day && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            📅 {workout.preferred_day}
                          </span>
                        )}

                        {workout.preferred_time && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            🕒 {formatTime(workout.preferred_time)}
                          </span>
                        )}

                        {!workout.preferred_day &&
                          !workout.preferred_time && (
                            <span className="text-xs text-muted-foreground">
                              No preferred time set
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  {workout.notes && (
                    <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                      {workout.notes}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === workout.id}
                      onClick={() => handleDelete(workout.id)}
                    >
                      {deletingId === workout.id
                        ? "Deleting..."
                        : "Delete Workout"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="py-8 text-center text-sm text-muted-foreground">
          Build healthy habits. Make time for yourself.
        </footer>
      </div>
    </main>
  );
}
