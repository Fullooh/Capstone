import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Link, navigate } from "@/lib/router";

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
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          My Dashboard
        </h1>

        <p className="mt-2 text-muted-foreground">
          Manage your school, work, workouts, personal activities, goals, and
          schedule.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Logged in as {session.user.email}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="School"
          description="Manage classes, grades, difficulty, and study needs."
          href="/school"
        />

        <DashboardCard
          title="Work"
          description="Manage your work schedule and availability."
          href="/work"
        />

        <DashboardCard
          title="Workout"
          description="Plan your workouts and fitness activities."
          href="/workout"
        />

        <DashboardCard
          title="Personal"
          description="Manage personal activities and commitments."
          href="/personal"
        />

        <DashboardCard
          title="Goals"
          description="Set your priorities and personal goals."
          href="/goals"
        />

        <DashboardCard
          title="Notes"
          description="Keep important reminders and information."
          href="/notes"
        />

        <DashboardCard
          title="Schedule"
          description="View your personalized weekly schedule."
          href="/schedule"
        />
      </div>

      <button
        onClick={() =>
          supabase.auth.signOut().then(() => navigate("/login"))
        }
        className="mt-8 w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Log Out
      </button>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent"
    >
      <h2 className="text-xl font-semibold">{title}</h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {description}
      </p>

      <p className="mt-4 text-sm font-medium">
        Open →
      </p>
    </Link>
  );
}