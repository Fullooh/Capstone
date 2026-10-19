export type Difficulty = "low" | "medium" | "high";

export type Subject = {
  id: number;
  name: string;
  grade: number | null;
  difficulty: Difficulty | null;
  study_hours: number | null;
  class_days: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
};

export type SubjectInput = Omit<Subject, "id">;

export const difficultyStyles: Record<Difficulty, string> = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

// Postgres returns times as "HH:MM:SS"; show them as "9:00 AM".
export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function letterGrade(grade: number) {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}
