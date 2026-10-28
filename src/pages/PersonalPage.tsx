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

    if (error) {
      toast.error("Couldn't load activities", {
        description: error.message,
      });
    } else {
      setActivities(data);
    }

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
      toast.error("Couldn't save activity", {
        description: error.message,
      });
      return;
    }

    form.reset();
    toast.success("Activity saved");
    await loadActivities();
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    const { error } = await supabase
      .from("personal_activities")
      .delete()
      .eq("id", id);

    setDeletingId(null);

    if (error) {
      toast.error("Couldn't delete activity", {
        description: error.message,
      });
      return;
    }

    setActivities((current) => current.filter((item) => item.id !== id));

    toast.success("Activity deleted");
  }

  const scheduledActivities = activities.filter(
    (item) => item.day || item.time
  ).length;

  const activitiesWithNotes = activities.filter(
    (item) => item.notes?.trim()
  ).length;

  const stats = [
    {
      label: "Total Activities",
      value: activities.length,
      icon: "🌿",
      color: "bg-blue-50 text-blue-700",
description: "Activities in your list",
    },
    {
      label: "Scheduled",
      value: scheduledActivities,
      icon: "📅",
      color: "bg-emerald-50 text-emerald-700",
description: "With a day or time",
    },
    {
      label: "With Notes",
      value: activitiesWithNotes,
      icon: "📝",
      color: "bg-violet-50 text-violet-700",
description: "With extra details",
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <header className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-3xl">
              🌿
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-primary">
                Your Personal Time
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Personal
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Make room for family, hobbies, appointments, and the things
                that keep you balanced outside of school and work.
              </p>
            </div>

            </div>

            <a
              href="#personal-form"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              + Add Activity
            </a>
          </div>
        </header>

        <section aria-label="Personal summary" className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Personal overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">A quick look at your personal time and planned activities.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {loading ? "—" : stat.value}
                  </p>
                </div>

                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        <section
          id="personal-form"
          className="scroll-mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pink-700">
              Make time for you
            </p>

            <h2 className="mt-1 text-xl font-bold">Personal Information</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Add an activity and when you'd like to fit it into your week.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-xl">
                  🌿
                </div>
                <div>
                  <h3 className="font-semibold">Personal Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    What do you want to make time for?
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="activity" className="text-sm font-medium">
                  Activity <span className="text-destructive">*</span>
                </label>

                <input
                  id="activity"
                  name="activity"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Family time, appointments, hobbies"
                  className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl">
                  📅
                </div>
                <div>
                  <h3 className="font-semibold">Availability</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose the day and time that work best.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="personalDay" className="text-sm font-medium">
                    Day
                  </label>

                  <input
                    id="personalDay"
                    name="day"
                    type="text"
                    placeholder="e.g. Saturday or weekends"
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xl">
                  📝
                </div>
                <div>
                  <h3 className="font-semibold">Personal Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Add any commitments or extra details.
                  </p>
                </div>
              </div>

              <label htmlFor="personalNotes" className="sr-only">
                Personal Notes
              </label>

              <textarea
                id="personalNotes"
                name="notes"
                rows={4}
                maxLength={2000}
                placeholder="e.g. Call ahead to book, bring a gift, takes about 2 hours..."
                className="mt-5 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Button type="reset" variant="outline" disabled={saving}>
                Clear Form
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Activity"}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pink-700">
                Your activity list
              </p>

              <h2 className="mt-1 text-xl font-bold">Your Activities</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Review your personal activities and remove anything you no
                longer need.
              </p>
            </div>

            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading activities..."
                : `${activities.length} ${activities.length === 1 ? "activity" : "activities"}`}
            </span>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed px-5 py-12 text-center">
              <div className="text-4xl">🌿</div>
              <h3 className="mt-4 font-semibold">No activities yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add your first personal activity above to start making time
                for yourself.
              </p>

              <a
                href="#personal-form"
                className="mt-5 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Add your first activity
              </a>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {activities.map((item) => (
                <li
                  key={item.id}
                  className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-xl">
                      🌿
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">
                        {item.activity}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.day && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            📅 {item.day}
                          </span>
                        )}

                        {item.time && (
                          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-700">
                            🕒 {formatTime(item.time)}
                          </span>
                        )}

                        {!item.day && !item.time && (
                          <span className="text-xs text-muted-foreground">
                            No day or time set
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                      {item.notes}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id
                        ? "Deleting..."
                        : "Delete Activity"}
                    </Button>
                  </div>
                </li>
              ))}
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