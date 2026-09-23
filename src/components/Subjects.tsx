import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Subject = {
  id: number;
  name: string;
};

export function Subjects({ session }: { session: Session }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("subjects")
      .insert({ name: name.trim(), user_id: session.user.id });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setName("");
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
    <div className="flex w-full max-w-sm flex-col gap-4">
      <h2 className="text-lg font-medium">Your subjects</h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="New subject name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
  );
}
