
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
  const [formKey, setFormKey] = useState(0);

  async function loadSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, grade, difficulty, study_hours, class_days, start_time, end_time, notes")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Couldn't load classes", {
        description: error.message,
      });
    } else {
      setSubjects(data);
    }

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
      ? await supabase
          .from("subjects")
          .update(input)
          .eq("id", editing.id)
      : await supabase
          .from("subjects")
          .insert({ ...input, user_id: userId });

    setSaving(false);

    if (error) {
      toast.error("Couldn't save class", {
        description: error.message,
      });
      return;
    }

    toast.success(editing ? "Class updated" : "Class added");
    setEditing(null);
    setFormKey((key) => key + 1);
    await loadSubjects();
  }

  function handleEdit(subject: Subject) {
    setEditing(subject);
    document
      .getElementById("class-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDelete(subject: Subject) {
    if (!window.confirm(`Delete ${subject.name}?`)) return;

    setDeletingId(subject.id);

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subject.id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete class", {
        description: error.message,
      });
      return;
    }

    if (editing?.id === subject.id) setEditing(null);

    setSubjects((current) =>
      current.filter((item) => item.id !== subject.id)
    );

    toast.success("Class deleted");
  }

  const graded = subjects.filter((subject) => subject.grade !== null);

  const averageGrade = graded.length
    ? Math.round(
        graded.reduce((sum, subject) => sum + (subject.grade ?? 0), 0) /
          graded.length
      )
    : null;

  const totalHours = subjects.reduce(
    (sum, subject) => sum + (subject.study_hours ?? 0),
    0
  );

  const hardClasses = subjects.filter(
    (subject) => subject.difficulty === "high"
  ).length;

  const stats = [
    {
      label: "Total classes",
      value: subjects.length,
      icon: "📚",
      description: "Subjects you're taking",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Average grade",
      value: averageGrade !== null ? `${averageGrade}%` : "—",
      icon: "📈",
      description: "Across graded classes",
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Study hours",
      value: totalHours,
      icon: "⏱️",
      description: "Planned each week",
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "High difficulty",
      value: hardClasses,
      icon: "🎯",
      description: "Classes needing attention",
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <header className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-700">
                📚
              </div>

              <div>
                <p className="text-sm font-medium text-primary">
                  YOUR ACADEMIC SPACE
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                  School
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Keep your classes organized, track your progress, and plan
                  your study time around the subjects that need it most.
                </p>
              </div>
            </div>

            <a
              href="#class-form"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <span aria-hidden="true">+</span>
              Add a class
            </a>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Academic overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick look at your current workload and progress.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${stat.color}`}
                    aria-hidden="true"
                  >
                    {stat.icon}
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 scroll-mt-6" id="class-form">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {editing ? "Edit class details" : "Manage your classes"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {editing
                ? "Update the information for this subject."
                : "Add a subject and record the details that help you plan your study time."}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
            <ClassForm
              key={editing ? `edit-${editing.id}` : `new-${formKey}`}
              initial={editing}
              saving={saving}
              onSubmit={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Your classes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                View and manage the subjects in your academic plan.
              </p>
            </div>

            <p className="text-sm font-medium text-muted-foreground">
              {subjects.length}{" "}
              {subjects.length === 1 ? "class" : "classes"}
            </p>
          </div>

          {loading ? (
            <div
              className="mt-5 rounded-2xl border bg-card p-10 text-center"
              role="status"
            >
              <p className="font-medium">Loading your classes...</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Retrieving your academic information.
              </p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                📖
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Start building your academic plan
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                You haven't added any classes yet. Add your first subject to
                start tracking grades, difficulty, and study hours.
              </p>
              <a
                href="#class-form"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Add your first class
              </a>
            </div>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
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

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
