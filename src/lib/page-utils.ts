import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { navigate } from "@/lib/router";
import { toDateKey } from "@/lib/schedule";

// Small helpers shared by the folder-style pages.

// "13:30:00" -> "1:30 PM"
export function formatClock(time: string | null) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

// "2026-11-09" -> "Nov 9, 2026"
export function formatDate(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function textOrNull(value: FormDataEntryValue | null) {
  const text = (value as string | null)?.trim();
  return text || null;
}

export function todayKey() {
  return toDateKey(new Date());
}

// Redirects to /login when signed out; otherwise resolves to the user's id.
export function useRequireUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) navigate("/login");
      else setUserId(user.id);
    });
  }, []);

  return userId;
}

// A value kept in this browser's localStorage, per user, under
// `my-schedule-360-<page>-<userId>` -> { [field]: value } (same layout as the Personal diary).
// Used for features that don't have a Supabase table yet.
export function useLocalState<T>(
  page: string,
  field: string,
  userId: string | null,
  fallback: T,
  isValid: (value: unknown) => boolean,
) {
  const [value, setValue] = useState<T>(fallback);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = userId ? `my-schedule-360-${page}-${userId}` : null;

  // Load once per user. `fallback`/`isValid` are intentionally not dependencies.
  useEffect(() => {
    if (!key) return;
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "{}");
      if (isValid(stored[field])) setValue(stored[field]);
    } catch {
      toast.error("Couldn't load saved data from this browser");
    }
    setLoadedFor(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, field]);

  useEffect(() => {
    if (!key || loadedFor !== key) return;
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...stored, [field]: value }));
    } catch {
      toast.error("Couldn't save data in this browser");
    }
  }, [value, key, field, loadedFor]);

  return [value, setValue] as const;
}

export function useLocalList<T>(page: string, field: string, userId: string | null) {
  return useLocalState<T[]>(page, field, userId, [], Array.isArray);
}
