
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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

type NoteDraft = {
  title: string;
  category: string;
  body: string;
};

const PINNED_STORAGE_KEY = "my-schedule-360-pinned-notes";

const categoryStyles: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 ring-slate-200",
  school: "bg-blue-50 text-blue-700 ring-blue-100",
  work: "bg-amber-50 text-amber-700 ring-amber-100",
  personal: "bg-pink-50 text-pink-700 ring-pink-100",
  goal: "bg-violet-50 text-violet-700 ring-violet-100",
};

const categories = [
  { value: "general", label: "General" },
  { value: "school", label: "School" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "goal", label: "Goal" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCategoryLabel(category: string) {
  return (
    categories.find((item) => item.value === category)?.label ??
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

function readPinnedIds(): number[] {
  try {
    const stored = localStorage.getItem(PINNED_STORAGE_KEY);

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (id): id is number => typeof id === "number" && Number.isFinite(id)
    );
  } catch {
    return [];
  }
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const [form, setForm] = useState<NoteDraft>({
    title: "",
    category: "general",
    body: "",
  });

  // Restore local pin preferences.
  useEffect(() => {
    setPinnedIds(readPinnedIds());
  }, []);

  // Keep pin preferences in the browser, not in Supabase.
  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      toast.error("Couldn't save your pin preferences");
    }
  }, [pinnedIds]);

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
      setNotes((data ?? []) as Note[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        navigate("/login");
        return;
      }

      await loadNotes();
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  function updateForm(field: keyof NoteDraft, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      title: "",
      category: "general",
      body: "",
    });
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const category = form.category;
    const body = form.body.trim();

    if (!title) {
      toast.error("Please add a title");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        const { data, error } = await supabase
          .from("notes")
          .update({
            title,
            category,
            body: body || null,
          })
          .eq("id", editingId)
          .select("id, title, category, body, created_at")
          .single();

        if (error) {
          toast.error("Couldn't update note", {
            description: error.message,
          });
          return;
        }

        setNotes((current) =>
          current.map((note) => (note.id === editingId ? data as Note : note))
        );

        toast.success("Note updated successfully");
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            title,
            category,
            body: body || null,
          })
          .select("id, title, category, body, created_at")
          .single();

        if (error) {
          toast.error("Couldn't save note", {
            description: error.message,
          });
          return;
        }

        setNotes((current) => [data as Note, ...current]);
        toast.success("Note created successfully");
      }

      resetForm();
    } catch {
      toast.error("Something went wrong while saving your note");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(note: Note) {
    setEditingId(note.id);
    setForm({
      title: note.title,
      category: note.category,
      body: note.body ?? "",
    });

    document.getElementById("note-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Couldn't delete note", {
          description: error.message,
        });
        return;
      }

      setNotes((current) => current.filter((note) => note.id !== id));
      setPinnedIds((current) => current.filter((noteId) => noteId !== id));

      if (editingId === id) {
        resetForm();
      }

      toast.success("Note deleted");
    } catch {
      toast.error("Something went wrong while deleting your note");
    } finally {
      setDeletingId(null);
    }
  }

  function togglePin(id: number) {
    const isPinned = pinnedIds.includes(id);

    setPinnedIds((current) =>
      isPinned
        ? current.filter((noteId) => noteId !== id)
        : [...current, id]
    );

    toast.success(isPinned ? "Note unpinned" : "Note pinned");
  }

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesSearch =
          !query ||
          note.title.toLowerCase().includes(query) ||
          (note.body ?? "").toLowerCase().includes(query);

        const matchesCategory =
          filterCategory === "all" || note.category === filterCategory;

        const matchesPinned =
          !showPinnedOnly || pinnedIds.includes(note.id);

        return matchesSearch && matchesCategory && matchesPinned;
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id);
        const bPinned = pinnedIds.includes(b.id);

        if (aPinned !== bPinned) return aPinned ? -1 : 1;

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });
  }, [notes, search, filterCategory, showPinnedOnly, pinnedIds]);

  const categoriesUsed = new Set(notes.map((note) => note.category)).size;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const addedThisWeek = notes.filter(
    (note) => new Date(note.created_at).getTime() >= weekAgo
  ).length;

  const pinnedCount = notes.filter((note) =>
    pinnedIds.includes(note.id)
  ).length;

  const stats = [
    {
      label: "Total Notes",
      value: notes.length,
      icon: "📝",
      description: "All your saved notes",
    },
    {
      label: "Categories",
      value: categoriesUsed,
      icon: "🗂️",
      description: "Categories currently in use",
    },
    {
      label: "Added This Week",
      value: addedThisWeek,
      icon: "📅",
      description: "Created in the last seven days",
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

        <header className="mt-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
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
                Capture ideas, organize reminders, and keep your school,
                work, personal, and goal-related information in one place.
              </p>
            </div>

            <a
              href="#note-form"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              + Create Note
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t bg-muted/20 px-6 py-3 text-xs text-muted-foreground sm:px-8">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Synced with your account
            </span>
            <span>{pinnedCount} pinned</span>
            <span>Search and filters apply instantly</span>
          </div>
        </header>

        <section
          aria-label="Notes summary"
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
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
          <section id="note-form" className="scroll-mt-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {editingId !== null ? "Edit note" : "Create a note"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {editingId !== null
                  ? "Make your changes and update the saved note."
                  : "Write down an idea, task, or reminder for later."}
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="note-title" className="text-sm font-medium">
                    Note title
                  </label>
                  <input
                    id="note-title"
                    name="title"
                    type="text"
                    placeholder="e.g. Data Mining homework"
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
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
                    value={form.category}
                    onChange={(event) =>
                      updateForm("category", event.target.value)
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="note-body" className="text-sm font-medium">
                    Details
                  </label>
                  <textarea
                    id="note-body"
                    name="body"
                    rows={6}
                    placeholder="Write your note, reminder, or ideas here..."
                    value={form.body}
                    onChange={(event) =>
                      updateForm("body", event.target.value)
                    }
                    className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 outline-none transition focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {form.body.length} characters
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={saving || loading}
                    className="w-full"
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                        ? "Update Note"
                        : "Save Note"}
                  </Button>

                  {editingId !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="mt-4 rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Organize as you go</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Choose a category and pin your most important notes to keep
                them easy to find.
              </p>
            </div>
          </section>

          <section>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-semibold">Your notes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search and manage your saved information.
                </p>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                {filteredNotes.length}{" "}
                {filteredNotes.length === 1 ? "note" : "notes"}
              </p>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <label htmlFor="note-search" className="sr-only">
                Search notes
              </label>
              <input
                id="note-search"
                type="search"
                placeholder="Search by title or details..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Category
                  <select
                    value={filterCategory}
                    onChange={(event) =>
                      setFilterCategory(event.target.value)
                    }
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All categories</option>
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={showPinnedOnly ? "default" : "outline"}
                    onClick={() => setShowPinnedOnly((current) => !current)}
                    className="w-full sm:w-auto"
                  >
                    📌 {showPinnedOnly ? "Showing pinned" : "Pinned only"}
                  </Button>
                </div>
              </div>

              {(search || filterCategory !== "all" || showPinnedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilterCategory("all");
                    setShowPinnedOnly(false);
                  }}
                  className="text-xs font-medium text-primary transition hover:underline"
                >
                  Clear search and filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl border bg-card p-10 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <p className="mt-4 font-medium">Loading your notes...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Retrieving your saved information.
                </p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
                  🗒️
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  {notes.length === 0
                    ? "Start your notes collection"
                    : "No notes found"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {notes.length === 0
                    ? "You haven't saved any notes yet. Create your first note to organize your ideas and reminders."
                    : "Try another search term or category, or clear your filters to see all your notes."}
                </p>

                {notes.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={() => {
                      setSearch("");
                      setFilterCategory("all");
                      setShowPinnedOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <a
                    href="#note-form"
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    Create your first note
                  </a>
                )}
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {filteredNotes.map((note) => {
                  const isPinned = pinnedIds.includes(note.id);

                  return (
                    <li
                      key={note.id}
                      className="rounded-2xl border bg-card p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md sm:p-6"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-base font-semibold">
                                {note.title}
                              </h3>

                              {isPinned && (
                                <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-800 ring-1 ring-yellow-200">
                                  📌 Pinned
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                                  categoryStyles[note.category] ??
                                  categoryStyles.general
                                }`}
                              >
                                {getCategoryLabel(note.category)}
                              </span>

                              <span className="text-xs text-muted-foreground">
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => togglePin(note.id)}
                            aria-label={isPinned ? "Unpin note" : "Pin note"}
                            title={isPinned ? "Unpin note" : "Pin note"}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm transition ${
                              isPinned
                                ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                                : "border-border bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {isPinned ? "📌" : "☆"}
                          </button>
                        </div>

                        {note.body ? (
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                            {note.body}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground/70">
                            No additional details.
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEdit(note)}
                          >
                            Edit note
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={deletingId === note.id}
                            onClick={() => handleDelete(note.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === note.id
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
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
