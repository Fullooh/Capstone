
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";
import { Button } from "@/components/ui/button";

type Section = "activities" | "diary";

type PersonalActivity = {
  id: number;
  activity: string;
  day: string | null;
  time: string | null;
  notes: string | null;
};

type DiaryEntry = {
  id: string;
  title: string;
  content: string;
  date: string;
};

function getStorageKey(userId: string) {
  return `my-schedule-360-personal-${userId}`;
}

function readDiary(userId: string): DiaryEntry[] {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed.diary) ? parsed.diary : [];
  } catch {
    toast.error("Couldn't load your diary entries");
    return [];
  }
}

function saveDiary(userId: string, diary: DiaryEntry[]) {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    const previous = stored ? JSON.parse(stored) : {};

    localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify({ ...previous, diary }),
    );
  } catch {
    toast.error("Couldn't save your diary in this browser");
  }
}

function formatDate(date: string) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return null;

  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = (value as string | null)?.trim();
  return text || null;
}

export function PersonalPage() {
  const [activeSection, setActiveSection] = useState<Section>("activities");
  const [userId, setUserId] = useState<string | null>(null);
  const [activities, setActivities] = useState<PersonalActivity[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);

  const [diaryForm, setDiaryForm] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // Load personal activities from Supabase.
  async function loadActivities() {
    const { data, error } = await supabase
      .from("personal_activities")
      .select("id, activity, day, time, notes")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Couldn't load personal activities", {
        description: error.message,
      });
      return;
    }

    setActivities(data ?? []);
  }

  // Check authentication and load the user's information.
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      if (!mounted) return;

      setUserId(user.id);
      setDiary(readDiary(user.id));

      await loadActivities();

      if (mounted) {
        setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Save diary entries in user-specific local storage.
  useEffect(() => {
    if (!userId || loading) return;

    saveDiary(userId, diary);
  }, [diary, userId, loading]);

  // Personal Overview calculations.
  const totalActivities = activities.length;

  const scheduledActivities = activities.filter(
    (item) => item.day || item.time,
  ).length;

  const totalDiaryEntries = diary.length;

  // Reset the activity form.
  function resetActivityForm(form: HTMLFormElement) {
    form.reset();
    setEditingActivityId(null);
  }

  // Add or update a personal activity.
  async function handleActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const activity = textOrNull(formData.get("activity"));

    if (!activity) {
      toast.error("Please enter an activity name");
      return;
    }

    const activityData = {
      activity,
      day: textOrNull(formData.get("day")),
      time: textOrNull(formData.get("time")),
      notes: textOrNull(formData.get("notes")),
    };

    setSavingActivity(true);

    const result = editingActivityId
      ? await supabase
          .from("personal_activities")
          .update(activityData)
          .eq("id", editingActivityId)
      : await supabase
          .from("personal_activities")
          .insert(activityData);

    setSavingActivity(false);

    if (result.error) {
      toast.error(
        editingActivityId
          ? "Couldn't update activity"
          : "Couldn't save activity",
        { description: result.error.message },
      );
      return;
    }

    resetActivityForm(form);

    toast.success(
      editingActivityId
        ? "Activity updated successfully"
        : "Activity added successfully",
    );

    await loadActivities();
  }

  // Load an activity into the form for editing.
  function editActivity(activity: PersonalActivity) {
    const form = document.getElementById(
      "activity-form",
    ) as HTMLFormElement | null;

    if (!form) return;

    (form.elements.namedItem("activity") as HTMLInputElement).value =
      activity.activity;

    (form.elements.namedItem("day") as HTMLInputElement).value =
      activity.day ?? "";

    (form.elements.namedItem("time") as HTMLInputElement).value =
      activity.time ?? "";

    (form.elements.namedItem("notes") as HTMLTextAreaElement).value =
      activity.notes ?? "";

    setEditingActivityId(activity.id);

    form.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Delete an activity.
  async function deleteActivity(id: number) {
    if (!window.confirm("Are you sure you want to delete this activity?")) {
      return;
    }

    setDeletingActivityId(id);

    const { error } = await supabase
      .from("personal_activities")
      .delete()
      .eq("id", id);

    setDeletingActivityId(null);

    if (error) {
      toast.error("Couldn't delete activity", {
        description: error.message,
      });
      return;
    }

    setActivities((current) =>
      current.filter((item) => item.id !== id),
    );

    if (editingActivityId === id) {
      const form = document.getElementById(
        "activity-form",
      ) as HTMLFormElement | null;

      form?.reset();
      setEditingActivityId(null);
    }

    toast.success("Activity deleted");
  }

  // Reset the diary form.
  function resetDiaryForm() {
    setDiaryForm({
      title: "",
      content: "",
      date: new Date().toISOString().slice(0, 10),
    });

    setEditingDiaryId(null);
  }

  // Add or update a diary entry.
  function handleDiarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!diaryForm.title.trim() || !diaryForm.content.trim()) {
      toast.error("Please add a title and diary entry");
      return;
    }

    if (editingDiaryId) {
      setDiary((current) =>
        current.map((entry) =>
          entry.id === editingDiaryId
            ? { ...entry, ...diaryForm }
            : entry,
        ),
      );

      toast.success("Diary entry updated");
    } else {
      const newEntry: DiaryEntry = {
        id: crypto.randomUUID(),
        ...diaryForm,
      };

      setDiary((current) => [newEntry, ...current]);

      toast.success("Diary entry saved");
    }

    resetDiaryForm();
  }

  // Load an existing diary entry into the form.
  function editDiaryEntry(entry: DiaryEntry) {
    setDiaryForm({
      title: entry.title,
      content: entry.content,
      date: entry.date,
    });

    setEditingDiaryId(entry.id);

    document.getElementById("diary-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Delete a diary entry.
  function deleteDiaryEntry(id: string) {
    if (!window.confirm("Are you sure you want to delete this diary entry?")) {
      return;
    }

    setDiary((current) =>
      current.filter((entry) => entry.id !== id),
    );

    if (editingDiaryId === id) {
      resetDiaryForm();
    }

    toast.success("Diary entry deleted");
  }

  const navigation = [
    {
      id: "activities" as Section,
      label: "Personal Activities",
      icon: "✓",
      description: "Manage your personal activities",
    },
    {
      id: "diary" as Section,
      label: "Diary",
      icon: "📔",
      description: "Your thoughts and memories",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Loading your personal space...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back to Dashboard */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>

        {/* Page Header */}
        <header className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-3xl">
              🌿
            </div>

            <div>
              <p className="text-sm font-medium text-primary">
                Your Personal Time
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Personal Space
              </h1>

              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Organize your personal responsibilities and keep a record of
                your experiences.
              </p>
            </div>
          </div>
        </header>

        {/* Personal Overview */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              Personal Overview
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Get a quick look at your personal activities and memories.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Total Activities */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total Activities
                </p>

                <span className="text-xl">✓</span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {totalActivities}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Activities in your personal folder
              </p>
            </div>

            {/* Scheduled Activities */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Scheduled Activities
                </p>

                <span className="text-xl">📅</span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {scheduledActivities}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Activities with a day or time assigned
              </p>
            </div>

            {/* Diary Entries */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Diary Entries
                </p>

                <span className="text-xl">📔</span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {totalDiaryEntries}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Memories and thoughts recorded
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">

          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="px-3 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Personal Folders
            </h2>

            <nav className="space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70 text-lg">
                    {item.icon}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>

                    <span
                      className={`mt-1 block text-xs ${
                        activeSection === item.id
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">

            {/* Personal Activities */}
            {activeSection === "activities" && (
              <div>
                <div className="mb-6">
                  <p className="text-sm font-medium text-primary">
                    Stay organized
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Personal Activities
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Keep track of appointments, family time, errands, and
                    other personal commitments. Activities with a day and
                    time will also appear on your weekly Schedule.
                  </p>
                </div>

                {/* Activity Form */}
                <form
                  id="activity-form"
                  onSubmit={handleActivitySubmit}
                  className="space-y-5 rounded-xl border bg-muted/20 p-5"
                >
                  <h3 className="font-semibold">
                    {editingActivityId
                      ? "Edit Activity"
                      : "Add a Personal Activity"}
                  </h3>

                  <label className="block text-sm font-medium">
                    Activity Name <span className="text-destructive">*</span>

                    <input
                      name="activity"
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Family time, grocery shopping, appointment"
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Day

                      <input
                        name="day"
                        type="text"
                        placeholder="e.g. Saturday or Mon-Fri"
                        className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Time

                      <input
                        name="time"
                        type="time"
                        className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium">
                    Notes

                    <textarea
                      name="notes"
                      rows={3}
                      maxLength={2000}
                      placeholder="Add any details or reminders..."
                      className="mt-2 w-full resize-y rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                    {editingActivityId && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={savingActivity}
                        onClick={() => {
                          const form = document.getElementById(
                            "activity-form",
                          ) as HTMLFormElement | null;

                          form?.reset();
                          setEditingActivityId(null);
                        }}
                      >
                        Cancel
                      </Button>
                    )}

                    <Button
                      type="reset"
                      variant="outline"
                      disabled={savingActivity}
                      onClick={() => setEditingActivityId(null)}
                    >
                      Clear Form
                    </Button>

                    <Button type="submit" disabled={savingActivity}>
                      {savingActivity
                        ? "Saving..."
                        : editingActivityId
                          ? "Update Activity"
                          : "Save Activity"}
                    </Button>
                  </div>
                </form>

                {/* Activity List */}
                <div className="mt-8">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Your Activities
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {activities.length}{" "}
                        {activities.length === 1 ? "activity" : "activities"}{" "}
                        in your personal folder
                      </p>
                    </div>
                  </div>

                  {activities.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-5 py-12 text-center">
                      <div className="text-4xl">✓</div>

                      <h3 className="mt-4 font-semibold">
                        Your activity folder is empty
                      </h3>

                      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                        Add your first personal activity to start organizing
                        your time.
                      </p>
                    </div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {activities.map((item) => (
                        <li
                          key={item.id}
                          className="flex min-w-0 flex-col rounded-xl border p-5 transition hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="break-words font-semibold">
                                {item.activity}
                              </h4>

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

                            <span className="rounded-lg bg-pink-50 px-2 py-1 text-sm">
                              ✓
                            </span>
                          </div>

                          {item.notes && (
                            <p className="mt-4 flex-1 whitespace-pre-wrap break-words border-t pt-4 text-sm leading-6 text-muted-foreground">
                              {item.notes}
                            </p>
                          )}

                          <div className="mt-4 flex justify-end gap-2 border-t pt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => editActivity(item)}
                            >
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={deletingActivityId === item.id}
                              onClick={() => deleteActivity(item.id)}
                            >
                              {deletingActivityId === item.id
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Diary */}
            {activeSection === "diary" && (
              <div>
                <div className="mb-6">
                  <p className="text-sm font-medium text-primary">
                    Your Personal Journal
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Diary
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Write down your thoughts, experiences, ideas, and memories.
                  </p>
                </div>

                {/* Diary Form */}
                <form
                  id="diary-form"
                  onSubmit={handleDiarySubmit}
                  className="space-y-4 rounded-xl border bg-muted/20 p-5"
                >
                  <h3 className="font-semibold">
                    {editingDiaryId ? "Edit Entry" : "Write a New Entry"}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Entry Title

                      <input
                        value={diaryForm.title}
                        onChange={(event) =>
                          setDiaryForm({
                            ...diaryForm,
                            title: event.target.value,
                          })
                        }
                        placeholder="Give your entry a title"
                        className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Date

                      <input
                        type="date"
                        value={diaryForm.date}
                        onChange={(event) =>
                          setDiaryForm({
                            ...diaryForm,
                            date: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium">
                    Your Thoughts

                    <textarea
                      value={diaryForm.content}
                      onChange={(event) =>
                        setDiaryForm({
                          ...diaryForm,
                          content: event.target.value,
                        })
                      }
                      placeholder="How was your day? What is on your mind?"
                      rows={6}
                      className="mt-2 w-full resize-y rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit">
                      {editingDiaryId ? "Update Entry" : "Save Entry"}
                    </Button>

                    {editingDiaryId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetDiaryForm}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>

                {/* Previous Diary Entries */}
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Previous Entries
                    </h3>

                    <span className="text-sm text-muted-foreground">
                      {diary.length}{" "}
                      {diary.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {diary.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-5 py-12 text-center">
                      <div className="text-4xl">📔</div>

                      <h3 className="mt-4 font-semibold">
                        Your journal starts here
                      </h3>

                      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                        Write your first entry to capture a thought,
                        experience, or memory.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...diary]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((entry) => (
                          <article
                            key={entry.id}
                            className="rounded-xl border p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h4 className="font-semibold">
                                  {entry.title}
                                </h4>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(entry.date)}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => editDiaryEntry(entry)}
                                >
                                  Edit
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteDiaryEntry(entry.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>

                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                              {entry.content}
                            </p>
                          </article>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
