import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { ClassForm } from "@/components/ClassForm";
import { ClassCard } from "@/components/ClassCard";
import type { Subject, SubjectInput } from "@/lib/subjects";

export function SchoolPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Changing the key remounts the form so it resets after adding a class.
  const [formKey, setFormKey] = useState(0);

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, grade, difficulty, study_hours, notes")
      .order("created_at", { ascending: true });

    if (error) toast.error("Couldn't load classes", { description: error.message });
    else setSubjects(data);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }
      setUserId(data.session.user.id);
      loadSubjects();
    });
  }, []);

  async function handleSave(input: SubjectInput) {
    if (!userId) return;
    setSaving(true);
    const { error } = editing
      ? await supabase.from("subjects").update(input).eq("id", editing.id)
      : await supabase.from("subjects").insert({ ...input, user_id: userId });
    setSaving(false);

    if (error) {
      toast.error("Couldn't save class", { description: error.message });
      return;
    }

    toast.success(editing ? "Class updated" : "Class added");
    setEditing(null);
    setFormKey((key) => key + 1);
    loadSubjects();
  }

  function handleEdit(subject: Subject) {
    setEditing(subject);
    document.getElementById("class-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleDelete(subject: Subject) {
    if (!window.confirm(`Delete ${subject.name}?`)) return;

    setDeletingId(subject.id);
    const { error } = await supabase.from("subjects").delete().eq("id", subject.id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete class", { description: error.message });
      return;
    }

    if (editing?.id === subject.id) setEditing(null);
    setSubjects((current) => current.filter((s) => s.id !== subject.id));
    toast.success("Class deleted");
  }

  const graded = subjects.filter((s) => s.grade !== null);
  const averageGrade = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length)
    : null;
  const totalHours = subjects.reduce((sum, s) => sum + (s.study_hours ?? 0), 0);
  const hardClasses = subjects.filter((s) => s.difficulty === "high").length;

  const stats = [
    { label: "Classes", value: subjects.length },
    { label: "Average Grade", value: averageGrade !== null ? `${averageGrade}%` : "—" },
    { label: "Study Hours / Week", value: totalHours },
    { label: "High Difficulty", value: hardClasses },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl text-blue-700">
          📚
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">School</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your classes, grades, study needs, and academic priorities.
          </p>
        </div>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-8">
        <ClassForm
          key={editing ? `edit-${editing.id}` : `new-${formKey}`}
          initial={editing}
          saving={saving}
          onSubmit={handleSave}
          onCancel={() => setEditing(null)}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Your Classes</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : subjects.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No classes yet. Add your first class above.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {subjects.map((subject) => (
              <ClassCard
                key={subject.id}
                subject={subject}
                deleting={deletingId === subject.id}
                onEdit={() => handleEdit(subject)}
                onDelete={() => handleDelete(subject)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
