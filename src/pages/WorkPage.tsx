import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { startOfWeek, toDateKey } from "@/lib/schedule";
import { todayKey, useRequireUser } from "@/lib/page-utils";
import { useSyncedList } from "@/lib/synced-list";
import {
  FolderLayout,
  FolderPageLoading,
  FolderPageShell,
  OverviewStats,
  PageHeader,
  type FolderNavItem,
} from "@/components/FolderPage";
import {
  HoursSection,
  JobsSection,
  TasksSection,
  shiftTable,
  taskTable,
  weeklyHours,
  type Job,
} from "@/components/WorkSections";

type Section = "jobs" | "hours" | "tasks";

const navigation: FolderNavItem<Section>[] = [
  { id: "jobs", label: "Jobs & Shifts", icon: "💼", description: "Your regular work schedule" },
  { id: "hours", label: "Hours Log", icon: "⏱️", description: "Hours worked and pay" },
  { id: "tasks", label: "Work Tasks", icon: "✅", description: "To-dos and deadlines" },
];

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

export function WorkPage() {
  const userId = useRequireUser();
  const [active, setActive] = useState<Section>("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Hours log and tasks load after the jobs, so old browser entries can be matched to a job.
  const jobsReady = loading ? null : userId;
  const shiftList = useSyncedList(shiftTable(jobsReady, jobs));
  const taskList = useSyncedList(taskTable(jobsReady, jobs));
  const shifts = shiftList.items;
  const tasks = taskList.items;

  async function loadJobs() {
    const { data, error } = await supabase
      .from("work_info")
      .select("id, job, work_days, start_time, end_time, priority, notes")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Couldn't load work information", { description: error.message });
      return;
    }
    setJobs(data ?? []);
  }

  useEffect(() => {
    if (!userId) return;
    loadJobs().then(() => setLoading(false));
  }, [userId]);

  // Overview numbers
  const scheduledHours = jobs.reduce((sum, job) => sum + (weeklyHours(job) ?? 0), 0);
  const weekStart = toDateKey(startOfWeek(new Date()));
  const loggedThisWeek = shifts
    .filter((s) => s.date >= weekStart && s.date <= todayKey())
    .reduce((sum, s) => sum + s.hours, 0);
  const openTasks = tasks.filter((t) => !t.done);
  const overdue = openTasks.filter((t) => t.due && t.due < todayKey()).length;

  if (loading || shiftList.loading || taskList.loading) return <FolderPageLoading message="Loading your work space..." />;

  return (
    <FolderPageShell>
      <PageHeader
        icon="💼"
        iconClassName="bg-amber-100"
        eyebrow="Your Professional Life"
        title="Work"
        description="Keep your jobs, hours and work to-dos in one place, balanced with the rest of your week."
      />

      <OverviewStats
        title="Work Overview"
        description="A quick look at your jobs, hours and open tasks."
        stats={[
          {
            label: "Jobs",
            value: jobs.length,
            icon: "💼",
            description: "Workplaces in your folder",
          },
          {
            label: "Scheduled Hours",
            value: formatHours(scheduledHours),
            icon: "📅",
            description: "Per week, from your regular shifts",
          },
          {
            label: "Logged This Week",
            value: formatHours(loggedThisWeek),
            icon: "⏱️",
            description: "Hours recorded since Monday",
          },
          {
            label: "Open Tasks",
            value: openTasks.length,
            icon: "✅",
            description: overdue ? `${overdue} overdue` : "Nothing overdue",
          },
        ]}
      />

      <FolderLayout title="Work Folders" items={navigation} active={active} onSelect={setActive}>
        {active === "jobs" && (
          <JobsSection
            jobs={jobs}
            onChanged={loadJobs}
            onRemoved={(id) => setJobs((current) => current.filter((j) => j.id !== id))}
          />
        )}
        {active === "hours" && <HoursSection jobs={jobs} shifts={shifts} actions={shiftList} />}
        {active === "tasks" && <TasksSection jobs={jobs} tasks={tasks} actions={taskList} />}
      </FolderLayout>
    </FolderPageShell>
  );
}
