import { useEffect, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

type PersonalActivity = {
  id: number;
  activity: string;
  day: string | null;
  time: string | null;
  notes: string | null;
};

// Postgres returns times as "HH:MM:SS"; show them as "9:00 AM".
function formatTime(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = (value as string | null)?.trim();
  return text || null;
}

export function PersonalPage() {
  const [activities, setActivities] = useState<PersonalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // RLS only returns the logged-in user's rows, so no user filter is needed here.
  async function loadActivities() {
    const { data, error } = await supabase
      .from("personal_activities")
      .select("id, activity, day, time, notes")
      .order("created_at", { ascending: true });

    if (error) toast.error("Couldn't load activities", { description: error.message });
    else setActivities(data);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/login");
        return;
      }
      loadActivities();
    });
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const activity = textOrNull(data.get("activity"));

    if (!activity) {
      toast.error("Please add an activity");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("personal_activities").insert({
      activity,
      day: textOrNull(data.get("day")),
      time: textOrNull(data.get("time")),
      notes: textOrNull(data.get("notes")),
    });
    setSaving(false);

    if (error) {
      toast.error("Couldn't save activity", { description: error.message });
      return;
    }

    form.reset();
    toast.success("Activity saved");
    loadActivities();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const { error } = await supabase
      .from("personal_activities")
      .delete()
      .eq("id", id);
    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete activity", { description: error.message });
      return;
    }

    setActivities((current) => current.filter((item) => item.id !== id));
    toast.success("Activity deleted");
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
        <h1 className="text-3xl font-semibold tracking-tight">Personal</h1>

        <p className="mt-2 text-muted-foreground">
          Manage your personal activities, commitments, and free time.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border bg-card p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold">Personal Information</h2>

        <div className="mt-6 grid gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Personal Activity</h3>

            <div className="mt-4">
              <label htmlFor="activity" className="text-sm font-medium">
                Activity
              </label>

              <input
                id="activity"
                name="activity"
                type="text"
                required
                placeholder="Example: Family time, appointments, hobbies"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Availability</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="personalDay" className="text-sm font-medium">
                  Day
                </label>

                <input
                  id="personalDay"
                  name="day"
                  type="text"
                  placeholder="Example: Saturday"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="personalTime" className="text-sm font-medium">
                  Time
                </label>

                <input
                  id="personalTime"
                  name="time"
                  type="time"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Personal Notes</h3>

            <textarea
              name="notes"
              rows={5}
              placeholder="Add any personal commitments or information..."
              className="mt-4 w-full rounded-md border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Personal Information"}
          </Button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Your Activities</h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        ) : activities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No activities yet. Add one above.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {activities.map((item) => (
              <li key={item.id} className="rounded-lg border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words">
                      {item.activity}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.day || "No day set"}
                      {item.time && ` · ${formatTime(item.time)}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                {item.notes && (
                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                    {item.notes}
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
