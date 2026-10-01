import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function SchoolPage() {
  return (
    
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">School</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your classes, grades, study needs, and academic priorities.
        </p>
      </div>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Academic Information</h2>

        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Your Subjects</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add and manage the subjects you are currently taking.
            </p>

            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">
                Manage Subjects
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Grades & Difficulty</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="grade" className="text-sm font-medium">
                  Current Grade
                </label>
                <input
                  id="grade"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Example: 85"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  defaultValue=""
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="" disabled>
                    Select difficulty
                  </option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Study Time</h3>

            <div className="mt-4 max-w-sm">
              <label htmlFor="studyHours" className="text-sm font-medium">
                Study Hours Per Week
              </label>
              <input
                id="studyHours"
                type="number"
                min="0"
                placeholder="Example: 5"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Academic Notes</h3>

            <textarea
              rows={5}
              placeholder="Add information about exams, assignments, difficult topics, or anything else..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save School Information</Button>
        </div>
      </section>
    </main>
  );
}