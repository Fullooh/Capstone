import { useEffect, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";

type Subject = {
  id: number;
  name: string;
};

export function SubjectsSection() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (error) toast.error("Couldn't load subjects", { description: error.message });
    else setSubjects(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") as string).trim();
    if (!name) return;

    setSubmitting(true);
    const { data: auth } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("subjects")
      .insert({ name, user_id: auth.session?.user.id });
    setSubmitting(false);

    if (error) {
      toast.error("Couldn't add subject", { description: error.message });
      return;
    }

    form.reset();
    toast.success("Subject added");
    loadSubjects();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete subject", { description: error.message });
      return;
    }

    setSubjects((current) => current.filter((subject) => subject.id !== id));
    toast.success("Subject deleted");
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">Your Subjects</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add and manage the subjects you are currently taking.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex items-end gap-2">
        <div className="flex-1">
          <FormField
            id="subjectName"
            name="name"
            label="New subject"
            placeholder="e.g. Biology"
            required
            disabled={submitting}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add"}
        </Button>
      </form>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="min-w-0 break-words">{subject.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${subject.name}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deletingId === subject.id}
                  onClick={() => handleDelete(subject.id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
