import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Subject } from "@/lib/subjects";

type Priority = "high" | "medium" | "low";
type AssignmentFilter = "all" | "upcoming" | "completed" | "overdue";
type AssignmentView = "list" | "calendar";

type Assignment = {
  id: string;
  title: string;
  subjectId: number;
  dueDate: string;
  completed: boolean;
  priority?: Priority;
};

type Flashcard = {
  id: string;
  subjectId: number;
  question: string;
  answer: string;
  reviewStatus?: "known" | "review";
};

type Props = {
  userId: string;
  subjects: Subject[];
  mode: "assignments" | "flashcards";
  selectedSubjectId?: number;
};

function getLocalDateString(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function daysUntil(dateString: string) {
  const due = new Date(`${dateString}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function getDeadlineLabel(dateString: string) {
  const days = daysUntil(dateString);

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
  }

  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;

  return `Due ${formatDate(dateString)}`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const priorityStyles: Record<Priority, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function SchoolTools({
  userId,
  subjects,
  mode,
  selectedSubjectId,
}: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");
  const [assignmentView, setAssignmentView] =
    useState<AssignmentView>("list");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyOrder, setStudyOrder] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);

  const assignmentKey = `ms360-${userId}-assignments`;
  const flashcardKey = `ms360-${userId}-flashcards`;

  useEffect(() => {
    setStudyMode(false);
    setStudyIndex(0);
    setRevealed([]);
  }, [selectedSubjectId]);

  useEffect(() => {
    setLoaded(false);

    try {
      const savedAssignments = localStorage.getItem(assignmentKey);
      const savedFlashcards = localStorage.getItem(flashcardKey);

      const parsedAssignments: Assignment[] = savedAssignments
        ? JSON.parse(savedAssignments)
        : [];

      const parsedFlashcards: Flashcard[] = savedFlashcards
        ? JSON.parse(savedFlashcards)
        : [];

      setAssignments(
        Array.isArray(parsedAssignments)
          ? parsedAssignments.map((item) => ({
              ...item,
              priority: item.priority ?? "medium",
            }))
          : []
      );

      setFlashcards(
        Array.isArray(parsedFlashcards) ? parsedFlashcards : []
      );
    } catch {
      toast.error("Couldn't load saved school tools.");
      setAssignments([]);
      setFlashcards([]);
    } finally {
      setLoaded(true);
    }
  }, [assignmentKey, flashcardKey]);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(assignmentKey, JSON.stringify(assignments));
    } catch {
      toast.error("Couldn't save assignments in this browser.");
    }
  }, [assignments, assignmentKey, loaded]);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(flashcardKey, JSON.stringify(flashcards));
    } catch {
      toast.error("Couldn't save flashcards in this browser.");
    }
  }, [flashcards, flashcardKey, loaded]);

  const today = getLocalDateString();

  const subjectAssignments =
    selectedSubjectId === undefined
      ? assignments
      : assignments.filter(
          (item) => item.subjectId === selectedSubjectId
        );

  const pending = subjectAssignments.filter(
    (item) => !item.completed
  );

  const completed = subjectAssignments.filter(
    (item) => item.completed
  );

  const overdue = pending.filter(
    (item) => item.dueDate < today
  );

  const upcoming = pending.filter(
    (item) => item.dueDate >= today
  );

  const completionRate = subjectAssignments.length
    ? Math.round(
        (completed.length / subjectAssignments.length) * 100
      )
    : 0;

  const className = (id: number) =>
    subjects.find((subject) => subject.id === id)?.name ??
    "Unknown class";

  const filteredAssignments = useMemo(() => {
    let result = assignments.filter((item) => {
      const matchesFolder =
        selectedSubjectId === undefined ||
        item.subjectId === selectedSubjectId;

      const matchesSearch = item.title
        .toLowerCase()
        .includes(search.toLowerCase());

      let matchesStatus = true;

      if (assignmentFilter === "completed") {
        matchesStatus = item.completed;
      } else if (assignmentFilter === "overdue") {
        matchesStatus = !item.completed && item.dueDate < today;
      } else if (assignmentFilter === "upcoming") {
        matchesStatus = !item.completed && item.dueDate >= today;
      }

      return matchesFolder && matchesSearch && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = {
          high: 0,
          medium: 1,
          low: 2,
        };

        const difference =
          priorityOrder[a.priority ?? "medium"] -
          priorityOrder[b.priority ?? "medium"];

        if (difference !== 0) return difference;
      }

      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }

      return a.dueDate.localeCompare(b.dueDate);
    });

    return result;
  }, [
    assignments,
    assignmentFilter,
    search,
    sortBy,
    selectedSubjectId,
    today,
  ]);

  const visibleFlashcards = useMemo(
    () =>
      flashcards.filter(
        (item) =>
          selectedSubjectId !== undefined &&
          item.subjectId === selectedSubjectId
      ),
    [flashcards, selectedSubjectId]
  );

  const knownCards = visibleFlashcards.filter(
    (card) => card.reviewStatus === "known"
  ).length;

  const reviewCards = visibleFlashcards.filter(
    (card) => card.reviewStatus === "review"
  ).length;

  const activeStudyCards = useMemo(() => {
    const source = studyMode ? studyOrder : [];

    return source
      .map((id) =>
        visibleFlashcards.find((card) => card.id === id)
      )
      .filter((card): card is Flashcard => Boolean(card));
  }, [studyMode, studyOrder, visibleFlashcards]);

  const currentStudyCard = activeStudyCards[studyIndex];

  function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedSubjectId === undefined) {
      toast.error("Open a class folder before adding an assignment.");
      return;
    }

    if (!title.trim() || !dueDate) {
      toast.error("Enter an assignment title and due date.");
      return;
    }

    setAssignments((current) => [
      ...current,
      {
        id: makeId(),
        title: title.trim(),
        subjectId: selectedSubjectId,
        dueDate,
        completed: false,
        priority,
      },
    ]);

    setTitle("");
    setDueDate("");
    setPriority("medium");

    toast.success("Assignment added.");
  }

  function addFlashcard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedSubjectId === undefined) {
      toast.error("Open a class folder before creating a flashcard.");
      return;
    }

    if (!question.trim() || !answer.trim()) {
      toast.error("Enter a question and answer.");
      return;
    }

    setFlashcards((current) => [
      ...current,
      {
        id: makeId(),
        subjectId: selectedSubjectId,
        question: question.trim(),
        answer: answer.trim(),
      },
    ]);

    setQuestion("");
    setAnswer("");

    toast.success("Flashcard created.");
  }

  function toggleComplete(id: string) {
    setAssignments((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  }

  function deleteAssignment(id: string) {
    setAssignments((current) =>
      current.filter((item) => item.id !== id)
    );

    toast.success("Assignment deleted.");
  }

  function deleteFlashcard(id: string) {
    setFlashcards((current) =>
      current.filter((item) => item.id !== id)
    );

    setRevealed((current) =>
      current.filter((item) => item !== id)
    );

    setStudyOrder((current) =>
      current.filter((item) => item !== id)
    );

    setStudyIndex(0);
    toast.success("Flashcard deleted.");
  }

  function toggleAnswer(id: string) {
    setRevealed((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function rateCard(
    id: string,
    status: "known" | "review"
  ) {
    setFlashcards((current) =>
      current.map((card) =>
        card.id === id
          ? { ...card, reviewStatus: status }
          : card
      )
    );

    setRevealed((current) =>
      current.filter((item) => item !== id)
    );

    if (studyIndex < activeStudyCards.length - 1) {
      setStudyIndex((index) => index + 1);
    } else {
      setStudyMode(false);
      toast.success("Study session completed!");
    }
  }

  function startStudy(shuffle = false) {
    if (visibleFlashcards.length === 0) {
      toast.error(
        "Create a flashcard before starting a study session."
      );
      return;
    }

    let cards = [...visibleFlashcards];

    if (shuffle) {
      cards = cards.sort(() => Math.random() - 0.5);
    }

    setStudyOrder(cards.map((card) => card.id));
    setStudyIndex(0);
    setRevealed([]);
    setStudyMode(true);
  }

  function changeMonth(offset: number) {
    setCalendarMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + offset,
          1
        )
    );
  }

  function getCalendarCells() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from(
        { length: numberOfDays },
        (_, index) => index + 1
      ),
    ];
  }

  if (!loaded) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Loading your academic tools...
      </p>
    );
  }

  return (
    <section className="space-y-7">
      <header className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl shadow-sm">
            {mode === "assignments" ? "📝" : "🧠"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              YOUR ACADEMIC TOOLKIT
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {mode === "assignments"
                ? "Assignments & Deadlines"
                : "Flashcards & Study Mode"}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {mode === "assignments"
                ? "Organize your coursework, prioritize deadlines, and stay on track."
                : "Build your own study cards, practice active recall, and track your progress."}
            </p>
          </div>
        </div>
      </header>

      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <div className="text-3xl">📚</div>
          <h3 className="mt-3 font-semibold">Add a class first</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your {mode === "assignments" ? "assignments" : "flashcards"} will
            be organized by the classes you add to School.
          </p>
        </div>
      ) : mode === "assignments" ? (
        <>
          {/* Assignment summary */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: "Total assignments",
                value: subjectAssignments.length,
                icon: "📋",
                color: "bg-blue-50 text-blue-700",
              },
              {
                label: "Upcoming",
                value: upcoming.length,
                icon: "⏳",
                color: "bg-violet-50 text-violet-700",
              },
              {
                label: "Completed",
                value: completed.length,
                icon: "✓",
                color: "bg-emerald-50 text-emerald-700",
              },
              {
                label: "Overdue",
                value: overdue.length,
                icon: "!",
                color: "bg-red-50 text-red-700",
              },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {stat.label}
                  </p>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold ${stat.color}`}
                  >
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              </article>
            ))}
          </div>

          {/* Completion progress */}
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Your completion progress</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep making progress, one task at a time.
                </p>
              </div>
              <p className="text-xl font-bold">{completionRate}%</p>
            </div>

            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Assignment completion"
              aria-valuenow={completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {completed.length} of {subjectAssignments.length} assignments completed
            </p>
          </section>

          {/* Add assignment */}
          <form
            onSubmit={addAssignment}
            className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
          >
            <div>
              <h3 className="text-lg font-semibold">Add an assignment</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Record the task, deadline, and priority.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="assignment-title"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Assignment title
                </label>
                <input
                  id="assignment-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Operating Systems Homework 3"
                  maxLength={150}
                  required
                  className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="assignment-due"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Due date
                </label>
                <input
                  id="assignment-due"
                  type="date"
                  value={dueDate}
                  min={today}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                  className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="assignment-priority"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Priority
                </label>
                <select
                  id="assignment-priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as Priority)
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">+</span> Add assignment
            </button>
          </form>

          {/* Assignment list controls */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Manage assignments</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, filter, sort, and review your deadlines.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
              <div>
                <label
                  htmlFor="assignment-search"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Search
                </label>
                <input
                  id="assignment-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assignments..."
                  className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="assignment-sort"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Sort by
                  </label>
                  <select
                    id="assignment-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm sm:max-w-xs"
                  >
                    <option value="date">Due date</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title</option>
                  </select>
                </div>

                <div className="flex rounded-lg border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setAssignmentView("list")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium sm:flex-none ${
                      assignmentView === "list"
                        ? "bg-card shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    ☷ List
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentView("calendar")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium sm:flex-none ${
                      assignmentView === "calendar"
                        ? "bg-card shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    ▦ Calendar
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["upcoming", "Upcoming"],
                    ["completed", "Completed"],
                    ["overdue", "Overdue"],
                  ] as [AssignmentFilter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAssignmentFilter(value)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                      assignmentFilter === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {assignmentView === "list" ? (
              filteredAssignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
                  <div className="text-3xl">📭</div>
                  <h4 className="mt-3 font-semibold">
                    No matching assignments
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try changing your filters or add a new assignment above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssignments.map((item) => {
                    const isOverdue =
                      !item.completed && item.dueDate < today;
                    const isDueSoon =
                      !item.completed &&
                      daysUntil(item.dueDate) >= 0 &&
                      daysUntil(item.dueDate) <= 2;

                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-6"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleComplete(item.id)}
                            aria-label={`Mark ${item.title} complete`}
                            className="mt-1 h-4 w-4 shrink-0 accent-primary"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`font-semibold ${
                                  item.completed
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }`}
                              >
                                {item.title}
                              </h4>

                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                  priorityStyles[item.priority ?? "medium"]
                                }`}
                              >
                                {item.priority ?? "medium"} priority
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                              <span className="text-muted-foreground">
                                📅 {formatDate(item.dueDate)}
                              </span>

                              {!item.completed && (
                                <span
                                  className={`font-semibold ${
                                    isOverdue
                                      ? "text-destructive"
                                      : isDueSoon
                                        ? "text-amber-600"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {getDeadlineLabel(item.dueDate)}
                                </span>
                              )}

                              {item.completed && (
                                <span className="font-semibold text-emerald-700">
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteAssignment(item.id)}
                            aria-label={`Delete ${item.title}`}
                            title="Delete assignment"
                            className="rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : (
              /* Calendar view */
              <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    aria-label="Previous month"
                    className="rounded-lg border px-3 py-2 hover:bg-muted"
                  >
                    ←
                  </button>

                  <h4 className="text-lg font-semibold">
                    {calendarMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </h4>

                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    aria-label="Next month"
                    className="rounded-lg border px-3 py-2 hover:bg-muted"
                  >
                    →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-semibold text-muted-foreground"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {getCalendarCells().map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} />;
                    }

                    const dateString = getLocalDateString(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day
                      )
                    );

                    const dayAssignments = filteredAssignments.filter(
                      (item) => item.dueDate === dateString
                    );

                    const isToday = dateString === today;

                    return (
                      <div
                        key={dateString}
                        className={`min-h-20 min-w-0 rounded-lg border p-1 sm:min-h-24 sm:p-2 ${
                          isToday
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold sm:text-sm ${
                            isToday ? "text-primary" : ""
                          }`}
                        >
                          {day}
                        </p>

                        <div className="mt-1 space-y-1">
                          {dayAssignments.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              title={`${item.title} — ${className(item.subjectId)}`}
                              className={`truncate rounded px-1 py-1 text-[9px] leading-tight sm:text-xs ${
                                item.completed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.dueDate < today
                                    ? "bg-red-100 text-red-800"
                                    : item.priority === "high"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {item.title}
                            </div>
                          ))}

                          {dayAssignments.length > 2 && (
                            <p className="text-[9px] text-muted-foreground sm:text-xs">
                              +{dayAssignments.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Calendar events follow your current search and filter
                  settings.
                </p>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Flashcard statistics */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {[
              {
                label: "Total cards",
                value: visibleFlashcards.length,
                icon: "🗂️",
              },
              {
                label: "Cards known",
                value: knownCards,
                icon: "✓",
              },
              {
                label: "Needs review",
                value: reviewCards,
                icon: "🔁",
              },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {stat.label}
                  </p>
                  <span aria-hidden="true">{stat.icon}</span>
                </div>
                <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              </article>
            ))}
          </div>

          {/* Study controls */}
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startStudy(false)}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                ▶ Study
              </button>
              <button
                type="button"
                onClick={() => startStudy(true)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                🔀 Shuffle
              </button>
            </div>
          </section>

          {/* Dedicated study mode */}
          {studyMode && currentStudyCard && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                    STUDY MODE
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {className(currentStudyCard.subjectId)}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setStudyMode(false)}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  Exit
                </button>
              </div>

              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Study session progress"
                aria-valuenow={Math.round(
                  ((studyIndex + 1) / activeStudyCards.length) * 100
                )}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${
                      ((studyIndex + 1) / activeStudyCards.length) * 100
                    }%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Card {studyIndex + 1} of {activeStudyCards.length}
              </p>

              <button
                type="button"
                onClick={() => toggleAnswer(currentStudyCard.id)}
                aria-expanded={revealed.includes(currentStudyCard.id)}
                className="mt-5 flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border bg-gradient-to-br from-muted/20 to-muted/60 p-6 text-center shadow-inner transition-colors hover:from-muted/40 hover:to-muted/70 sm:min-h-72"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  {revealed.includes(currentStudyCard.id)
                    ? "ANSWER"
                    : "QUESTION"}
                </span>
                <span className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed sm:text-xl">
                  {revealed.includes(currentStudyCard.id)
                    ? currentStudyCard.answer
                    : currentStudyCard.question}
                </span>
                <span className="mt-6 text-xs text-muted-foreground">
                  Click the card to{" "}
                  {revealed.includes(currentStudyCard.id)
                    ? "show the question"
                    : "reveal the answer"}
                </span>
              </button>

              {revealed.includes(currentStudyCard.id) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      rateCard(currentStudyCard.id, "review")
                    }
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    ↻ Need more practice
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      rateCard(currentStudyCard.id, "known")
                    }
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    ✓ I know this
                  </button>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={studyIndex === 0}
                  onClick={() => {
                    setStudyIndex((index) => Math.max(0, index - 1));
                    setRevealed([]);
                  }}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  disabled={studyIndex >= activeStudyCards.length - 1}
                  onClick={() => {
                    setStudyIndex((index) =>
                      Math.min(activeStudyCards.length - 1, index + 1)
                    );
                    setRevealed([]);
                  }}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </section>
          )}

          {/* Create flashcard */}
          <form
            onSubmit={addFlashcard}
            className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
          >
            <div>
              <h3 className="text-lg font-semibold">Create a flashcard</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Write a question on the front and its answer on the back.
              </p>
            </div>

            <div>
              <label
                htmlFor="flashcard-question"
                className="mb-1.5 block text-sm font-medium"
              >
                Question — front of card
              </label>
              <textarea
                id="flashcard-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Enter your question..."
                maxLength={1000}
                required
                rows={3}
                className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label
                htmlFor="flashcard-answer"
                className="mb-1.5 block text-sm font-medium"
              >
                Answer — back of card
              </label>
              <textarea
                id="flashcard-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Enter the answer..."
                maxLength={2000}
                required
                rows={3}
                className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              + Create flashcard
            </button>
          </form>

          {/* Flashcard library */}
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                Your flashcards ({visibleFlashcards.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a card to reveal its answer, or start a study session.
              </p>
            </div>

            {visibleFlashcards.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
                <div className="text-3xl">🧠</div>
                <h4 className="mt-3 font-semibold">No flashcards yet</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first card to start studying.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleFlashcards.map((card) => (
                  <article
                    key={card.id}
                    className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {className(card.subjectId)}
                      </span>

                      {card.reviewStatus && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            card.reviewStatus === "known"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {card.reviewStatus === "known"
                            ? "Known"
                            : "Review"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAnswer(card.id)}
                      aria-expanded={revealed.includes(card.id)}
                      className="my-4 min-h-36 flex-1 rounded-xl bg-muted/50 p-4 text-left transition-colors hover:bg-muted"
                    >
                      <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {revealed.includes(card.id)
                          ? "Answer · Click to hide"
                          : "Question · Click to reveal"}
                      </span>

                      <span className="whitespace-pre-wrap font-medium leading-relaxed">
                        {revealed.includes(card.id)
                          ? card.answer
                          : card.question}
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAnswer(card.id)}
                        className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                      >
                        {revealed.includes(card.id)
                          ? "Show question"
                          : "Reveal answer"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteFlashcard(card.id)}
                        className="rounded-lg px-3 py-2 text-sm text-destructive hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}