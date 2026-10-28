
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
      setNotes(data ?? []);
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
    const title = String(data.get("title") ?? "").trim();
    const category = String(data.get("category") ?? "general");
    const body = String(data.get("body") ?? "").trim();

    if (!title) {
      toast.error("Please add a title");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("notes").insert({
      title,
      category,
      body: body || null,
    });

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

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

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
      description: "Notes saved in your space",
    },
    {
      label: "Categories",
      value: categoriesUsed,
      icon: "🗂️",
      description: "Different categories in use",
    },
    {
      label: "Added This Week",
      value: addedThisWeek,
      icon: "📅",
      description: "Notes created in the last seven days",
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-3xl">
              📝
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                Your Personal Workspace
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Notes
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Keep important reminders, ideas, school notes, work details,
                and personal information organized in one place.
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

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl">
                  {stat.icon}
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section id="note-form">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Create a note</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Save an idea or reminder so you can find it later.
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="note-title"
                    className="text-sm font-medium"
                  >
                    Note title
                  </label>

                  <input
                    id="note-title"
                    name="title"
                    type="text"
                    placeholder="e.g. Data Mining homework"
                    required
                    maxLength={150}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="note-category"
                    className="text-sm font-medium"
                  >
                    Category
                  </label>

                  <select
                    id="note-category"
                    name="category"
                    defaultValue="general"
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="general">General</option>
                    <option value="school">School</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="goal">Goal</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="note-body"
                    className="text-sm font-medium"
                  >
                    Details
                  </label>

                  <textarea
                    id="note-body"
                    name="body"
                    rows={5}
                    placeholder="Write your note or reminder here..."
                    className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? "Saving note..." : "Save Note"}
                </Button>
              </form>
            </div>
          </section>

          <section>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-semibold">Your notes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  View and manage your saved information.
                </p>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </p>
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl border bg-card p-10 text-center">
                <p className="font-medium">Loading your notes...</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Retrieving your saved information.
                </p>
              </div>
            ) : notes.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
                  🗒️
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  Start your notes collection
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  You haven't saved any notes yet. Create your first note to
                  keep your reminders, ideas, and important details organized.
                </p>

                <a
                  href="#note-form"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Create your first note
                </a>
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-semibold">
                            {note.title}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              categoryStyles[note.category] ??
                              categoryStyles.general
                            }`}
                          >
                            {note.category.charAt(0).toUpperCase() +
                              note.category.slice(1)}
                          </span>
                        </div>

                        {note.body && (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                            {note.body}
                          </p>
                        )}

                        <p className="mt-4 text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(note.created_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={deletingId === note.id}
                        onClick={() => handleDelete(note.id)}
                        className="shrink-0"
                      >
                        {deletingId === note.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
