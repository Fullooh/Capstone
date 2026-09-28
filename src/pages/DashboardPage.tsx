import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";

type Subject = {
  id: number;
  name: string;
};

export function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }
      setSession(data.session);
      setCheckingSession(false);
    });
  }, []);

  if (checkingSession || !session) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <SubjectsSection session={session} />
    </main>
  );
}

function SubjectsSection({ session }: { session: Session }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (error) setError(error.message);
    else setSubjects(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") as string).trim();
    if (!name) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("subjects")
      .insert({ name, user_id: session.user.id });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    form.reset();
    loadSubjects();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    setDeletingId(null);

    if (error) {
      setError(error.message);
      return;
    }

    loadSubjects();
  }

  return (
    <section className="rounded-xl border bg-card p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your Subjects</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Logged in as {session.user.email}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex items-end gap-2">
        <div className="flex-1">
          <FormField
            id="name"
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

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                {subject.name}
                <Button
                  variant="ghost"
                  size="icon-sm"
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

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => supabase.auth.signOut().then(() => navigate("/login"))}
      >
        Log out
      </Button>
    </section>
  );
}
