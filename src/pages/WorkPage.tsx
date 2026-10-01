import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function WorkPage() {
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

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Work Information</h2>

        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="job" className="text-sm font-medium">
              Job / Workplace
            </label>
            <input
              id="job"
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
              rows={5}
              placeholder="Add work-related information..."
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save Work Information</Button>
        </div>
      </section>
    </main>
  );
}