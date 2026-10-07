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

    if (error) toast.error("Couldn't load notes", { description: error.message });
    else setNotes(data);
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
    const { error } = await supabase // sends request to supabase
      .from("notes")
      .insert({ title, category, body: body || null }); // sends the note data
    setSaving(false);

    if (error) {
      toast.error("Couldn't save note", { description: error.message });
      return;
    }

    form.reset();
    toast.success("Note saved");
    loadNotes();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("notes").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete note", { description: error.message });
      return;
    }

    setNotes((current) => current.filter((note) => note.id !== id));
    toast.success("Note deleted");
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
        <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-2 text-muted-foreground">
          Keep important reminders and information in one place.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border bg-card p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold">Create a Note</h2>

        <div className="mt-6 grid gap-4">
          <div>
            <label htmlFor="noteTitle" className="text-sm font-medium">
              Note Title
            </label>
            <input
              id="noteTitle"
              name="title"
              required
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
              name="category"
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
              name="body"
              rows={8}
              placeholder="Write your note here..."
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Your Notes</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : notes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No notes yet. Create one above.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words">{note.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="capitalize">{note.category}</span>
                      {" · "}
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === note.id}
                    onClick={() => handleDelete(note.id)}
                  >
                    {deletingId === note.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                {note.body && (
                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                    {note.body}
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
