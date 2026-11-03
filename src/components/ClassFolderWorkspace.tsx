import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { SchoolTools } from "@/components/SchoolTools";
import type { Subject } from "@/lib/subjects";

type Tab = "assignments" | "flashcards" | "notes";

type Note = {
  id: string;
  subjectId: number;
  title: string;
  content: string;
  updatedAt: string;
};

type Props = {
  userId: string;
  subject: Subject;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onBack: () => void;
  onEditClass: () => void;
};

export function ClassFolderWorkspace({
  userId,
  subject,
  tab,
  onTabChange,
  onBack,
  onEditClass,
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const storageKey = `ms360-${userId}-class-notes`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setNotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      toast.error("Couldn't load class notes.");
      setNotes([]);
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {
      toast.error("Couldn't save notes in this browser.");
    }
  }, [notes, storageKey, loaded]);

  const classNotes = notes
    .filter((note) => note.subjectId === subject.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!noteTitle.trim() && !noteContent.trim()) {
      toast.error("Write a title or some note content first.");
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      setNotes((current) =>
        current.map((note) =>
          note.id === editingId
            ? {
                ...note,
                title: noteTitle.trim() || "Untitled note",
                content: noteContent,
                updatedAt: now,
              }
            : note
        )
      );

      toast.success("Note updated.");
    } else {
      setNotes((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          subjectId: subject.id,
          title: noteTitle.trim() || "Untitled note",
          content: noteContent,
          updatedAt: now,
        },
      ]);

      toast.success("Note saved.");
    }

    setEditingId(null);
    setNoteTitle("");
    setNoteContent("");
  }

  function editNote(note: Note) {
    setEditingId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  }

  function deleteNote(id: string) {
    if (!window.confirm("Delete this note?")) return;

    setNotes((current) =>
      current.filter((note) => note.id !== id)
    );

    if (editingId === id) {
      setEditingId(null);
      setNoteTitle("");
      setNoteContent("");
    }

    toast.success("Note deleted.");
  }

  const tabs: {
    id: Tab;
    label: string;
    icon: string;
  }[] = [
    { id: "assignments", label: "Assignments", icon: "📝" },
    { id: "flashcards", label: "Flashcards", icon: "🎴" },
    { id: "notes", label: "Notes", icon: "📒" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← School overview
          </button>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">
            SUBJECT FOLDER
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {subject.name}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Keep all your {subject.name} materials in one place.
          </p>
        </div>

        <button
          onClick={onEditClass}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Edit class
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {tab !== "notes" && (
        <SchoolTools
          key={`${subject.id}-${tab}`}
          userId={userId}
          subjects={[subject]}
          mode={tab}
          selectedSubjectId={subject.id}
        />
      )}

      {tab === "notes" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <form
            onSubmit={saveNote}
            className="space-y-4 rounded-2xl border bg-card p-5"
          >
            <div>
              <h3 className="text-lg font-semibold">
                {editingId ? "Edit note" : "Create a note"}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Notes saved here belong to {subject.name}.
              </p>
            </div>

            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title"
              maxLength={120}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your class notes..."
              rows={9}
              className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {editingId ? "Save changes" : "Save note"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setNoteTitle("");
                    setNoteContent("");
                  }}
                  className="rounded-lg border px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">
                Your notes
              </h3>

              <p className="text-sm text-muted-foreground">
                {classNotes.length}{" "}
                {classNotes.length === 1 ? "note" : "notes"}
              </p>
            </div>

            {!loaded ? (
              <p className="text-sm text-muted-foreground">
                Loading notes...
              </p>
            ) : classNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No notes yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first note for {subject.name}.
                </p>
              </div>
            ) : (
              classNotes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold">
                        {note.title}
                      </h4>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated{" "}
                        {new Date(note.updatedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => editNote(note)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {note.content}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}