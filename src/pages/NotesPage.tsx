
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

type NoteFolder = {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
};

const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "general", name: "General", color: "slate", isDefault: true },
  { id: "school", name: "School", color: "blue", isDefault: true },
  { id: "work", name: "Work", color: "amber", isDefault: true },
  { id: "personal", name: "Personal", color: "pink", isDefault: true },
  { id: "goal", name: "Goals", color: "violet", isDefault: true },
];

function getFoldersStorageKey(userId: string) {
  return `my-schedule-360-note-folders-${userId}`;
}

function getFavoritesStorageKey(userId: string) {
  return `my-schedule-360-pinned-notes-${userId}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readFolders(userId: string): NoteFolder[] {
  try {
    const stored = localStorage.getItem(getFoldersStorageKey(userId));

    if (!stored) return DEFAULT_FOLDERS;

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return DEFAULT_FOLDERS;

    const savedFolders = parsed.filter(
      (folder): folder is NoteFolder =>
        typeof folder?.id === "string" &&
        typeof folder?.name === "string" &&
        typeof folder?.color === "string"
    );

    const merged = [...DEFAULT_FOLDERS];

    savedFolders.forEach((folder) => {
      const existingIndex = merged.findIndex(
        (item) => item.id === folder.id
      );

      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...folder,
        };
      } else {
        merged.push(folder);
      }
    });

    return merged;
  } catch {
    return DEFAULT_FOLDERS;
  }
}

function readFavorites(userId: string): number[] {
  try {
    const stored = localStorage.getItem(getFavoritesStorageKey(userId));

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (id): id is number =>
        typeof id === "number" && Number.isFinite(id)
    );
  } catch {
    return [];
  }
}

export function NotesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>(DEFAULT_FOLDERS);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("all");

  const [form, setForm] = useState<NoteDraft>({
    title: "",
    category: "general",
    body: "",
  });

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        navigate("/login");
        return;
      }

      const currentUserId = data.session.user.id;

      setUserId(currentUserId);
      setFolders(readFolders(currentUserId));
      setFavoriteIds(readFavorites(currentUserId));

      const { data: noteData, error: noteError } = await supabase
        .from("notes")
        .select("id, title, category, body, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (noteError) {
        toast.error("Couldn't load notes", {
          description: noteError.message,
        });
      } else {
        setNotes((noteData ?? []) as Note[]);
      }

      setLoading(false);
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    try {
      localStorage.setItem(
        getFoldersStorageKey(userId),
        JSON.stringify(folders)
      );
    } catch {
      toast.error("Couldn't save your folder preferences");
    }
  }, [folders, userId]);

  useEffect(() => {
    if (!userId) return;

    try {
      localStorage.setItem(
        getFavoritesStorageKey(userId),
        JSON.stringify(favoriteIds)
      );
    } catch {
      toast.error("Couldn't save your favorites");
    }
  }, [favoriteIds, userId]);

  function updateForm(field: keyof NoteDraft, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      title: "",
      category:
        activeView !== "all" && activeView !== "favorites"
          ? activeView
          : "general",
      body: "",
    });

    setEditingId(null);
  }

  function openFolder(folderId: string) {
    setActiveView(folderId);

    setForm({
      title: "",
      category: folderId,
      body: "",
    });

    setEditingId(null);

    setTimeout(() => {
      document.getElementById("note-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
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
          current.map((note) =>
            note.id === editingId ? (data as Note) : note
          )
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

      setNotes((current) =>
        current.filter((note) => note.id !== id)
      );

      setFavoriteIds((current) =>
        current.filter((noteId) => noteId !== id)
      );

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

  function toggleFavorite(id: number) {
    const isFavorite = favoriteIds.includes(id);

    setFavoriteIds((current) =>
      isFavorite
        ? current.filter((noteId) => noteId !== id)
        : [...current, id]
    );

    toast.success(
      isFavorite ? "Removed from favorites" : "Added to favorites"
    );
  }

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesSearch =
          !query ||
          note.title.toLowerCase().includes(query) ||
          (note.body ?? "").toLowerCase().includes(query);

        const matchesView =
          activeView === "all"
            ? true
            : activeView === "favorites"
              ? favoriteIds.includes(note.id)
              : note.category === activeView;

        return matchesSearch && matchesView;
      })
      .sort((a, b) => {
        const aFavorite = favoriteIds.includes(a.id);
        const bFavorite = favoriteIds.includes(b.id);

        if (aFavorite !== bFavorite) {
          return aFavorite ? -1 : 1;
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });
  }, [notes, search, activeView, favoriteIds]);

  const favoriteCount = notes.filter((note) =>
    favoriteIds.includes(note.id)
  ).length;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const addedThisWeek = notes.filter(
    (note) => new Date(note.created_at).getTime() >= weekAgo
  ).length;

  const activeFolder = folders.find(
    (folder) => folder.id === activeView
  );

  const activeTitle =
    activeView === "all"
      ? "All Notes"
      : activeView === "favorites"
        ? "Favorite Notes"
        : activeFolder?.name ?? "All Notes";

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        {/* Page Header */}
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
                Capture ideas, organize reminders, and keep your
                school, work, personal, and goal-related information
                in one place.
              </p>
            </div>

            <a
              href="#note-form"
              onClick={() => {
                setActiveView("all");
                setForm({
                  title: "",
                  category: "general",
                  body: "",
                });
                setEditingId(null);
              }}
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
            <span>{favoriteCount} favorites</span>
            <span>{folders.length} folders</span>
          </div>
        </header>

        {/* Overview */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Notes",
              value: notes.length,
              icon: "📝",
              description: "All your saved notes",
            },
            {
              label: "My Folders",
              value: folders.length,
              icon: "🗂️",
              description: "Your organized note folders",
            },
            {
              label: "Added This Week",
              value: addedThisWeek,
              icon: "📅",
              description: "Created in the last seven days",
            },
          ].map((stat) => (
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

        {/* Main Workspace */}
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[250px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">My Workspace</h2>

            <div className="mt-4 space-y-1">
              <button
                type="button"
                onClick={() => setActiveView("all")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  activeView === "all"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📚</span>
                  All Notes
                </span>
                <span className="text-xs">{notes.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("favorites")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  activeView === "favorites"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>⭐</span>
                  Favorites
                </span>
                <span className="text-xs">{favoriteCount}</span>
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Folders
              </h3>

              <div className="mt-3 space-y-1">
                {folders.map((folder) => {
                  const count = notes.filter(
                    (note) => note.category === folder.id
                  ).length;

                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => openFolder(folder.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        activeView === folder.id
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span>📁</span>
                        <span className="truncate">{folder.name}</span>
                      </span>

                      <span className="text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-violet-50 p-3">
              <p className="text-sm font-semibold text-violet-900">
                Stay organized
              </p>

              <p className="mt-1 text-xs leading-5 text-violet-800">
                Select a folder to create a note directly inside
                that section.
              </p>
            </div>
          </aside>

          {/* Notes Content */}
          <div className="min-w-0 space-y-6">
            {/* Note Form */}
            <section id="note-form" className="scroll-mt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {editingId !== null ? "Edit note" : "Create a note"}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {editingId !== null
                    ? "Make your changes and update your saved note."
                    : `Create a new note in ${
                        folders.find(
                          (folder) => folder.id === form.category
                        )?.name ?? "General"
                      }.`}
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

                  {/* Folder dropdown removed.
                      The selected left sidebar folder determines
                      the category when a note is created. */}

                  <div className="space-y-2">
                    <label
                      htmlFor="note-body"
                      className="text-sm font-medium"
                    >
                      Details
                    </label>

                    <textarea
                      id="note-body"
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
            </section>

            {/* Notes List */}
            <section>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-lg font-semibold">
                    {activeTitle}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Search and manage your saved information.
                  </p>
                </div>

                <p className="text-sm font-medium text-muted-foreground">
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "note" : "notes"}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                <input
                  type="search"
                  placeholder="Search by title or details..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-3 text-xs font-medium text-primary hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {loading ? (
                <div className="mt-5 rounded-2xl border bg-card p-10 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />

                  <p className="mt-4 font-medium">
                    Loading your notes...
                  </p>

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
                      : "There are no notes in this section. Try another folder or clear your search."}
                  </p>

                  {notes.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-5"
                      onClick={() => {
                        setActiveView("all");
                        setSearch("");
                      }}
                    >
                      View all notes
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="mt-5 grid gap-4">
                  {filteredNotes.map((note) => {
                    const isFavorite = favoriteIds.includes(note.id);

                    return (
                      <li
                        key={note.id}
                        className="group rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-base font-semibold tracking-tight text-foreground">
                              {note.title}
                            </h3>

                            <p className="mt-2 text-xs text-muted-foreground">
                              Created {formatDate(note.created_at)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleFavorite(note.id)}
                            aria-label={
                              isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                            title={
                              isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                              isFavorite
                                ? "bg-yellow-50 text-yellow-600"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <span className="text-lg">
                              {isFavorite ? "★" : "☆"}
                            </span>
                          </button>
                        </div>

                        {note.body ? (
                          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                            {note.body}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm italic text-muted-foreground/70">
                            No additional details.
                          </p>
                        )}

                        <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(note)}
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deletingId === note.id}
                            onClick={() => handleDelete(note.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === note.id
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
