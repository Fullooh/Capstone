import { useEffect, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

type Note = {
  id: number;
  title: string;
  category: string;
  body: string | null;
  created_at: string;
};

// Matches the section colors on the dashboard.
const categoryStyles: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  school: "bg-blue-50 text-blue-700",
  work: "bg-amber-50 text-amber-700",
  personal: "bg-pink-50 text-pink-700",
  goal: "bg-violet-50 text-violet-700",
};

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, category, body, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Couldn't load notes", {
        description: error.message,
      });
    } else {
      setNotes(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }

      loadNotes();
    });
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = (data.get("title") as string).trim();
    const category = data.get("category") as string;
    const body = (data.get("body") as string).trim();

    if (!title) {
      toast.error("Please add a title");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("notes")
      .insert({ title, category, body: body || null });

    setSaving(false);

    if (error) {
      toast.error("Couldn't save note", {
        description: error.message,
      });
      return;
    }

    form.reset();
    toast.success("Note saved");
    await loadNotes();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const { error } = await supabase.from("notes").delete().eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete note", {
        description: error.message,
      });
      return;
    }

    setNotes((current) => current.filter((note) => note.id !== id));

    toast.success("Note deleted");
  }

  const categoriesUsed = new Set(notes.map((note) => note.category)).size;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const addedThisWeek = notes.filter(
    (note) => new Date(note.created_at) >= weekAgo
  ).length;

  const stats = [
    {
      label: "Total Notes",
      value: notes.length,
      icon: "📝",
      description: "Notes you've saved",
    },
    {
      label: "Categories",
      value: categoriesUsed,
      icon: "🗂️",
      description: "Areas your notes cover",
    },
    {
      label: "This Week",
      value: addedThisWeek,
      icon: "🗓️",
      description: "Added in the last 7 days",
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
              📝
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                Your Reminders
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Notes
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Keep important reminders and information in one place, sorted
                by the part of your life they belong to.
              </p>
            </div>

            <a
              href="#note-form"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              + Add Note
            </a>
          </div>
        </header>

        <section
          aria-label="Notes summary"
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

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
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
          id="note-form"
          className="mt-8 scroll-mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
              Write it down
            </p>

            <h2 className="mt-1 text-xl font-bold">Create a Note</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Give your note a title, pick where it belongs, and add the
              details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-xl">
                  🏷️
                </div>
                <div>
                  <h3 className="font-semibold">Note Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Name your note and choose a category.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="noteTitle" className="text-sm font-medium">
                    Note Title <span className="text-destructive">*</span>
                  </label>

                  <input
                    id="noteTitle"
                    name="title"
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. Important assignment"
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="noteCategory" className="text-sm font-medium">
                    Category
                  </label>

                  <select
                    id="noteCategory"
                    name="category"
                    defaultValue="general"
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="general">General</option>
                    <option value="school">School</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="goal">Goal</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xl">
                  📝
                </div>
                <div>
                  <h3 className="font-semibold">Note</h3>
                  <p className="text-sm text-muted-foreground">
                    Write down whatever you need to remember.
                  </p>
                </div>
              </div>

              <label htmlFor="note" className="sr-only">
                Note
              </label>

              <textarea
                id="note"
                name="body"
                rows={8}
                maxLength={5000}
                placeholder="Write your note here..."
                className="mt-5 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Button type="reset" variant="outline" disabled={saving}>
                Clear Form
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
                Your reminders
              </p>

              <h2 className="mt-1 text-xl font-bold">Your Notes</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Look back over your notes and remove anything you no longer
                need.
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading notes..."
                : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
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
          ) : notes.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-5 py-12 text-center">
              <div className="text-4xl">📝</div>
              <h3 className="mt-4 font-semibold">No notes yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Create your first note above to keep important reminders in
                one place.
              </p>

              <a
                href="#note-form"
                className="mt-5 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Write your first note
              </a>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                      📝
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">
                        {note.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            categoryStyles[note.category] ?? categoryStyles.general
                          }`}
                        >
                          {note.category}
                        </span>

                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          🗓️ {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {note.body && (
                    <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                      {note.body}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === note.id}
                      onClick={() => handleDelete(note.id)}
                    >
                      {deletingId === note.id ? "Deleting..." : "Delete Note"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="py-8 text-center text-sm text-muted-foreground">
          Write it down. Free up your mind.
        </footer>
      </div>
    </main>
  );
}
