import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function GoalsPage() {
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

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
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
                type="text"
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
                  type="date"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Goal Notes</h3>

            <textarea
              rows={5}
              placeholder="Add details or additional information about your goal..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save Goal</Button>
        </div>
      </section>
    </main>
  );
}