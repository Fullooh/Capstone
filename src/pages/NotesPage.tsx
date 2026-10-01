import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

export function NotesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-2 text-muted-foreground">
          Keep important reminders and information in one place.
        </p>
      </div>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Create a Note</h2>

        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="noteTitle" className="text-sm font-medium">
              Note Title
            </label>
            <input
              id="noteTitle"
              placeholder="Example: Important assignment"
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="noteCategory" className="text-sm font-medium">
              Category
            </label>
            <select
              id="noteCategory"
              defaultValue="general"
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="general">General</option>
              <option value="school">School</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="goal">Goal</option>
            </select>
          </div>

          <div>
            <label htmlFor="note" className="text-sm font-medium">
              Note
            </label>
            <textarea
              id="note"
              rows={8}
              placeholder="Write your note here..."
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button>Save Note</Button>
        </div>
      </section>
    </main>
  );
}