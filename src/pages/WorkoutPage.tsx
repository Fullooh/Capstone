import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { addDays, startOfWeek, toDateKey } from "@/lib/schedule";
import { todayKey, useLocalList, useLocalState, useRequireUser } from "@/lib/page-utils";
import {
  FolderLayout,
  FolderPageLoading,
  FolderPageShell,
  OverviewStats,
  PageHeader,
  type FolderNavItem,
} from "@/components/FolderPage";
import {
  LogSection,
  ProgressSection,
  RoutineSection,
  type Workout,
  type WorkoutSession,
} from "@/components/WorkoutSections";

type Section = "routine" | "log" | "progress";

const navigation: FolderNavItem<Section>[] = [
  { id: "routine", label: "Weekly Routine", icon: "🏋️", description: "Plan when you train" },
  { id: "log", label: "Workout Log", icon: "📒", description: "Record finished sessions" },
  { id: "progress", label: "Progress", icon: "📈", description: "Weekly goal and streaks" },
];

// Days in a row (ending today, or yesterday if nothing is logged yet today) with a session.
function currentStreak(dates: Set<string>) {
  let day = new Date();
  if (!dates.has(toDateKey(day))) day = addDays(day, -1);
  let streak = 0;
  while (dates.has(toDateKey(day))) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export function WorkoutPage() {
  const userId = useRequireUser();
  const [active, setActive] = useState<Section>("routine");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  // The routine lives in Supabase (it feeds the Schedule page); the log and goal are
  // kept in this browser for now, like the Personal diary.
  const [sessions, setSessions] = useLocalList<WorkoutSession>("workout", "log", userId);
  const [weeklyGoal, setWeeklyGoal] = useLocalState<number>(
    "workout",
    "weeklyGoal",
    userId,
    3,
    (value) => typeof value === "number" && value > 0,
  );

  async function loadWorkouts() {
    const { data, error } = await supabase
      .from("workouts")
      .select("id, workout_type, preferred_day, preferred_time, notes")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Couldn't load workouts", { description: error.message });
      return;
    }
    setWorkouts(data ?? []);
  }

  useEffect(() => {
    if (!userId) return;
    loadWorkouts().then(() => setLoading(false));
  }, [userId]);

  function logSession(session: Omit<WorkoutSession, "id">) {
    setSessions((current) => [{ id: crypto.randomUUID(), ...session }, ...current]);
  }

  // Overview numbers
  const weekStart = toDateKey(startOfWeek(new Date()));
  const thisWeek = sessions.filter((s) => s.date >= weekStart && s.date <= todayKey());
  const minutesThisWeek = thisWeek.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const streak = currentStreak(new Set(sessions.map((s) => s.date)));

  if (loading) return <FolderPageLoading message="Loading your fitness space..." />;

  return (
    <FolderPageShell>
      <PageHeader
        icon="🏃"
        iconClassName="bg-emerald-100"
        eyebrow="Your Fitness Space"
        title="Workout"
        description="Plan your training week, log what you finish, and keep your streak going."
      />

      <OverviewStats
        title="Fitness Overview"
        description="A quick look at your routine and this week's progress."
        stats={[
          {
            label: "Planned Workouts",
            value: workouts.length,
            icon: "🏋️",
            description: "In your weekly routine",
          },
          {
            label: "This Week",
            value: `${thisWeek.length} / ${weeklyGoal}`,
            icon: "🎯",
            description: "Sessions toward your weekly goal",
          },
          {
            label: "Active Minutes",
            value: minutesThisWeek,
            icon: "⏱️",
            description: "Logged since Monday",
          },
          {
            label: "Current Streak",
            value: `${streak} ${streak === 1 ? "day" : "days"}`,
            icon: "🔥",
            description: "Days in a row with a session",
          },
        ]}
      />

      <FolderLayout title="Fitness Folders" items={navigation} active={active} onSelect={setActive}>
        {active === "routine" && (
          <RoutineSection
            workouts={workouts}
            sessions={sessions}
            onChanged={loadWorkouts}
            onRemoved={(id) => setWorkouts((current) => current.filter((w) => w.id !== id))}
            onLogToday={(workout) => {
              logSession({
                date: todayKey(),
                workout: workout.workout_type,
                minutes: null,
                intensity: "moderate",
                notes: "",
              });
              toast.success(`Logged ${workout.workout_type} for today`);
            }}
          />
        )}

        {active === "log" && (
          <LogSection
            workouts={workouts}
            sessions={sessions}
            setSessions={setSessions}
            onLog={logSession}
          />
        )}

        {active === "progress" && (
          <ProgressSection
            sessions={sessions}
            weeklyGoal={weeklyGoal}
            setWeeklyGoal={setWeeklyGoal}
            streak={streak}
          />
        )}
      </FolderLayout>
    </FolderPageShell>
  );
}
