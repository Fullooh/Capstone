import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function PersonalPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Personal</h1>

        <p className="mt-2 text-muted-foreground">
          Manage your personal activities, commitments, and free time.
        </p>
      </div>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Personal Information</h2>

        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Personal Activity</h3>

            <div className="mt-4">
              <label htmlFor="activity" className="text-sm font-medium">
                Activity
              </label>

              <input
                id="activity"
                type="text"
                placeholder="Example: Family time, appointments, hobbies"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Availability</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="personalDay" className="text-sm font-medium">
                  Day
                </label>

                <input
                  id="personalDay"
                  type="text"
                  placeholder="Example: Saturday"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="personalTime" className="text-sm font-medium">
                  Time
                </label>

                <input
                  id="personalTime"
                  type="time"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Personal Notes</h3>

            <textarea
              rows={5}
              placeholder="Add any personal commitments or information..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save Personal Information</Button>
        </div>
      </section>
    </main>
  );
}