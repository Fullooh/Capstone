import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { ClassForm } from "@/components/ClassForm";
import { ClassCard } from "@/components/ClassCard";
import { ClassFolderWorkspace } from "@/components/ClassFolderWorkspace";
import type { Subject, SubjectInput } from "@/lib/subjects";

type FolderTab = "assignments" | "flashcards" | "notes";
type SchoolSection = "overview" | "classes" | "folder";

export function SchoolPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [activeSection, setActiveSection] = useState<SchoolSection>("overview");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [folderTab, setFolderTab] = useState<FolderTab>("assignments");
  const [expandedFolders, setExpandedFolders] = useState<number[]>([]);

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
      setSubjects(data ?? []);
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
    setActiveSection("classes");

    window.setTimeout(() => {
      document
        .getElementById("class-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
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

    setSubjects((current) =>
      current.filter((item) => item.id !== subject.id)
    );

    if (editing?.id === subject.id) {
      setEditing(null);
    }

    if (selectedSubject?.id === subject.id) {
      setSelectedSubject(null);
      setActiveSection("overview");
    }

    setExpandedFolders((current) =>
      current.filter((id) => id !== subject.id)
    );

    toast.success("Class deleted");
  }

  function openFolder(subject: Subject, tab: FolderTab) {
    setSelectedSubject(subject);
    setFolderTab(tab);
    setActiveSection("folder");

    setExpandedFolders((current) =>
      current.includes(subject.id)
        ? current
        : [...current, subject.id]
    );
  }

  const graded = subjects.filter(
    (subject) => subject.grade !== null
  );

  const averageGrade = graded.length
    ? Math.round(
        graded.reduce(
          (sum, subject) => sum + (subject.grade ?? 0),
          0
        ) / graded.length
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
    },
    {
      label: "Average grade",
      value: averageGrade !== null ? `${averageGrade}%` : "—",
      icon: "📈",
      description: "Across graded classes",
    },
    {
      label: "Study hours",
      value: `${totalHours}h`,
      icon: "⏱️",
      description: "Planned each week",
    },
    {
      label: "High difficulty",
      value: hardClasses,
      icon: "🎯",
      description: "Classes needing attention",
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>

        <header className="mt-6 flex flex-col justify-between gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
              📚
            </div>

            <div>
              <p className="text-sm font-medium text-primary">
                YOUR ACADEMIC SPACE
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                School
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Keep your classes organized, track your progress, and plan
                your study time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setActiveSection("classes");

              window.setTimeout(() => {
                document
                  .getElementById("class-form")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 0);
            }}
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            + Add a class
          </button>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border bg-card p-3">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Academic tools
            </p>

            <button
              onClick={() => setActiveSection("overview")}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
                activeSection === "overview"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              📊 School Overview
            </button>

            <button
              onClick={() => setActiveSection("classes")}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${
                activeSection === "classes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              📚 Manage Classes
            </button>

            <div className="border-t pt-3">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                My subjects
              </p>

              {loading ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </p>
              ) : subjects.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Add a class to create its folder.
                </p>
              ) : (
                subjects.map((subject) => {
                  const expanded = expandedFolders.includes(subject.id);

                  return (
                    <div key={subject.id} className="mb-1">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedFolders((current) =>
                            expanded
                              ? current.filter((id) => id !== subject.id)
                              : [...current, subject.id]
                          )
                        }
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted ${
                          selectedSubject?.id === subject.id &&
                          activeSection === "folder"
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        <span className="text-xs">
                          {expanded ? "▾" : "▸"}
                        </span>
                        <span>📁</span>
                        <span className="min-w-0 flex-1 truncate">
                          {subject.name}
                        </span>
                      </button>

                      {expanded && (
                        <div className="ml-7 space-y-1 border-l pl-3">
                          {(
                            [
                              {
                                id: "assignments",
                                label: "Assignments",
                                icon: "📝",
                              },
                              {
                                id: "flashcards",
                                label: "Flashcards",
                                icon: "🎴",
                              },
                              {
                                id: "notes",
                                label: "Notes",
                                icon: "📒",
                              },
                            ] as {
                              id: FolderTab;
                              label: string;
                              icon: string;
                            }[]
                          ).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => openFolder(subject, item.id)}
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium ${
                                activeSection === "folder" &&
                                selectedSubject?.id === subject.id &&
                                folderTab === item.id
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {item.icon} {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <div className="min-w-0 space-y-8">
            {activeSection === "overview" && (
              <>
                <section>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">
                      Academic overview
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A quick look at your current workload and progress.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => (
                      <article
                        key={stat.label}
                        className="rounded-2xl border bg-card p-5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-muted-foreground">
                            {stat.label}
                          </p>
                          <span className="text-xl">{stat.icon}</span>
                        </div>

                        <p className="mt-4 text-3xl font-bold">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stat.description}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-end justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Your classes
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Open a subject folder from the sidebar to access its
                        tools.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveSection("classes")}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Manage classes →
                    </button>
                  </div>

                  {loading ? (
                    <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
                      Loading your classes...
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
                      <p className="font-semibold">
                        Start building your academic plan
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Add your first class to create its folder.
                      </p>
                      <button
                        onClick={() => setActiveSection("classes")}
                        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        + Add your first class
                      </button>
                    </div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {subjects.slice(0, 3).map((subject) => (
                        <li key={subject.id} className="list-none">
                          <div className="mb-2 rounded-xl border bg-card p-3">
                            <button
                              onClick={() =>
                                openFolder(subject, "assignments")
                              }
                              className="text-left text-sm font-semibold text-primary hover:underline"
                            >
                              📁 Open {subject.name} folder →
                            </button>
                          </div>

                          <ClassCard
                            subject={subject}
                            deleting={deletingId === subject.id}
                            onEdit={() => handleEdit(subject)}
                            onDelete={() => handleDelete(subject)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            {activeSection === "classes" && (
              <section>
                <div className="mb-6">
                  <p className="text-sm font-medium text-primary">
                    CLASS MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Manage your classes
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add subjects, update class details, and manage your
                    academic workload.
                  </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
                  <section id="class-form" className="scroll-mt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">
                        {editing ? "Edit class details" : "Add a class"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {editing
                          ? "Update this subject's information."
                          : "Record the details that help you plan your study time."}
                      </p>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
                      <ClassForm
                        key={
                          editing
                            ? `edit-${editing.id}`
                            : `new-${formKey}`
                        }
                        initial={editing}
                        saving={saving}
                        onSubmit={handleSave}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  </section>

                  <section>
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Your classes
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Each class automatically gets its own folder.
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {subjects.length}{" "}
                        {subjects.length === 1 ? "class" : "classes"}
                      </p>
                    </div>

                    {loading ? (
                      <p className="mt-5 text-sm text-muted-foreground">
                        Loading your classes...
                      </p>
                    ) : subjects.length === 0 ? (
                      <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No classes yet. Add your first subject.
                      </p>
                    ) : (
                      <ul className="mt-5 grid gap-4">
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
                </div>
              </section>
            )}

            {activeSection === "folder" && userId && selectedSubject && (
              <ClassFolderWorkspace
                userId={userId}
                subject={selectedSubject}
                tab={folderTab}
                onTabChange={setFolderTab}
                onBack={() => setActiveSection("overview")}
                onEditClass={() => handleEdit(selectedSubject)}
              />
            )}
          </div>
        </div>

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}