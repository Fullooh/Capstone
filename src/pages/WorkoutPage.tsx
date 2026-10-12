import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function WorkoutPage() {
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

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
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
                type="text"
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
                  type="time"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Fitness Notes</h3>

            <textarea
              rows={5}
              placeholder="Add your fitness goals, preferences, or other information..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save Workout Information</Button>
        </div>
      </section>
    </main>
  );
}