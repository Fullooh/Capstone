
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";

const sections = [
  {
    title: "School",
    description: "Organize classes, grades, assignments, and study time.",
    href: "/school",
    icon: "📚",
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "Work",
    description: "Manage shifts, work commitments, and availability.",
    href: "/work",
    icon: "💼",
    color: "bg-amber-50 text-amber-700",
  },
  {
    title: "Workout",
    description: "Plan fitness sessions and build healthy routines.",
    href: "/workout",
    icon: "🏃",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Personal",
    description: "Make time for personal activities and commitments.",
    href: "/personal",
    icon: "🌿",
    color: "bg-pink-50 text-pink-700",
  },
  {
    title: "Goals",
    description: "Track priorities, deadlines, and personal progress.",
    href: "/goals",
    icon: "🎯",
    color: "bg-violet-50 text-violet-700",
  },
  {
    title: "Notes",
    description: "Keep useful reminders and important information.",
    href: "/notes",
    icon: "📝",
    color: "bg-orange-50 text-orange-700",
  },
];

export function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error || !data.session) {
        navigate("/login");
        return;
      }

      setSession(data.session);
      setCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Unable to log out:", error.message);
      return;
    }

    navigate("/login");
  }

  if (checkingSession || !session) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Loading your dashboard...
        </p>
      </main>
    );
  }

  const email = session.user.email ?? "User";
  const firstName = email.split("@")[0].split(/[._-]/)[0];
  const displayName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
              360
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">
                My Schedule 360
              </p>
              <p className="text-xs text-muted-foreground">
                Your life, better organized.
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-muted-foreground">
                Your personal workspace
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Welcome banner */}
        <section className="mt-8 overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground sm:p-9">
          <p className="text-sm font-medium opacity-80">
            YOUR PERSONAL WORKSPACE
          </p>

          <div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back, {displayName}!
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 opacity-85 sm:text-base">
                Bring your responsibilities together, focus on what matters,
                and make room for the things you enjoy.
              </p>
            </div>

            <Link
              href="/schedule"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
            >
              View my schedule <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Overview */}
        <section className="mt-9">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Your overview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an area to manage your information.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.title}
                href={section.href}
                className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${section.color}`}
                  >
                    {section.icon}
                  </div>

                  <span className="text-lg text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground">
                    →
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold">
                  {section.title}
                </h3>

                <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">
                  {section.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-primary">
                  Manage {section.title.toLowerCase()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Schedule feature */}
        <section className="mt-9 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                🗓️
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Your week, at a glance
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Bring school, work, fitness, personal activities, and goals
                  into one weekly calendar. Your personalized schedule can be
                  generated once your information is connected.
                </p>
              </div>
            </div>

            <Link
              href="/schedule"
              className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open calendar <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t py-5 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}
