// Pure helpers for the Schedule page: time/day parsing, week dates and overlap layout.

export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type Source = "class" | "work" | "workout" | "personal" | "study" | "goal";

export type ScheduleItem = {
  key: string;
  title: string;
  source: Source;
  dayText: string | null;
  start: number | null; // hours since midnight, e.g. 13.5 = 1:30 PM
  end: number | null;
};

export type PlacedItem = ScheduleItem & {
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

export function formatTime(hour: number) {
  const h = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Postgres returns times as "HH:MM:SS"; turn them into hours since midnight.
export function toHours(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

// "mon", "tues", "thurs", "friday"... -> index into `days`. The word must be the start
// of a day name and at least 3 letters, so words like "the", "thru" or "we" don't count.
function dayIndex(word: string) {
  if (word.length < 3) return -1;
  return days.findIndex((day) => day.toLowerCase().startsWith(word));
}

// Days are typed as free text, so read them loosely:
// "Monday", "mon", "Mon/Wed/Fri", "Monday - Friday", "weekdays", "weekends", "daily".
export function parseDays(text: string | null) {
  if (!text) return [];
  const value = text.toLowerCase();
  const result = new Set<number>();

  if (/\b(daily|every ?day|all week)\b/.test(value)) return [0, 1, 2, 3, 4, 5, 6];
  if (/\bweekdays?\b/.test(value)) [0, 1, 2, 3, 4].forEach((d) => result.add(d));
  if (/\bweekends?\b/.test(value)) [5, 6].forEach((d) => result.add(d));

  // Ranges like "Mon-Fri" or "Monday to Thursday"
  const rangePattern = /([a-z]+)\s*(?:-|–|to|through|thru)\s*([a-z]+)/g;
  for (const [, from, to] of value.matchAll(rangePattern)) {
    const a = dayIndex(from);
    const b = dayIndex(to);
    if (a === -1 || b === -1) continue;
    for (let d = a; d !== (b + 1) % 7; d = (d + 1) % 7) result.add(d);
  }

  for (const word of value.split(/[^a-z]+/)) {
    const d = dayIndex(word);
    if (d !== -1) result.add(d);
  }

  return [...result].sort();
}

// Monday of the week `date` falls in, at local midnight.
export function startOfWeek(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function addDays(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

// Local "YYYY-MM-DD", the same format Postgres uses for `date` columns.
export function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Side-by-side lanes for items that overlap on the same day.
export function layoutDay(items: (ScheduleItem & { start: number; end: number })[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: PlacedItem[] = [];
  let group: PlacedItem[] = [];
  let groupEnd = -1;
  let laneEnds: number[] = [];

  const closeGroup = () => {
    group.forEach((item) => (item.lanes = laneEnds.length));
    placed.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.end;
    groupEnd = Math.max(groupEnd, item.end);
    group.push({ ...item, lane, lanes: 1 });
  }
  closeGroup();

  return placed;
}
