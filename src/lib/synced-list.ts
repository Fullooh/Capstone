import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// A list of the signed-in user's rows in one Supabase table, with add / update / remove.
// Updates and removes show right away and roll back if the save fails; adds wait for the save.
//
// `legacy` points at where the list used to be kept in localStorage. On first load those
// items are copied into the table once, then removed from the browser.

type Item = { id: string };

export type LegacySource<T> = {
  key: string; // localStorage key
  field?: string; // when the key holds an object, the field that holds the list
  toItem: (old: Record<string, unknown>) => T | null; // null = skip this entry
};

export type SyncedListOptions<T extends Item, R> = {
  table: string;
  userId: string | null; // null = don't load yet
  label: string; // used in error messages, e.g. "hours log"
  orderBy?: string; // default created_at
  ascending?: boolean; // default false (newest first); new items go at the matching end
  fromRow: (row: R & Item) => T;
  toRow: (item: T) => R; // every column except id and user_id
  legacy?: LegacySource<T>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres errors that mean "this one row is bad" (missing class/job, failed check, bad
// value) rather than "the request failed". Old entries like that are dropped on import.
const BAD_ROW_CODES = new Set(["23502", "23503", "23514", "22P02", "22003", "22007", "22008"]);

// One import per key at a time (React runs effects twice in dev).
const imports = new Map<string, Promise<void>>();

function importLegacy<T extends Item, R>(table: string, legacy: LegacySource<T>, toRow: (item: T) => R) {
  const running = imports.get(legacy.key + table);
  if (running) return running;

  const job = (async () => {
    let stored: unknown;
    try {
      const raw = localStorage.getItem(legacy.key);
      if (!raw) return;
      stored = JSON.parse(raw);
    } catch {
      return; // unreadable / storage blocked: nothing we can import
    }

    const holder = stored as Record<string, unknown> | null;
    const list = legacy.field ? holder?.[legacy.field] : stored;
    if (!Array.isArray(list)) return;

    const items = list
      .map((entry) => (entry && typeof entry === "object" ? legacy.toItem(entry as Record<string, unknown>) : null))
      .filter((item): item is T => item !== null)
      .map((item) => (UUID.test(item.id) ? item : { ...item, id: crypto.randomUUID() }));

    // Re-read before writing: other lists may share this key (Work keeps shifts and tasks together).
    function write(value: unknown[] | null) {
      if (legacy.field) {
        let latest: Record<string, unknown> = {};
        try {
          latest = JSON.parse(localStorage.getItem(legacy.key) ?? "{}") ?? {};
        } catch {
          // fall through with an empty object
        }
        const next = { ...latest };
        if (value === null) delete next[legacy.field];
        else next[legacy.field] = value;
        if (Object.keys(next).length === 0) localStorage.removeItem(legacy.key);
        else localStorage.setItem(legacy.key, JSON.stringify(next));
      } else if (value === null) {
        localStorage.removeItem(legacy.key);
      } else {
        localStorage.setItem(legacy.key, JSON.stringify(value));
      }
    }

    // Save the new ids first so a retry after a failed upload doesn't create duplicates.
    write(items);

    const rows = items.map((item) => ({ id: item.id, ...toRow(item) }));
    if (rows.length > 0) {
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (error) {
        // Fall back to one at a time, dropping entries the database rejects.
        for (const row of rows) {
          const { error: rowError } = await supabase
            .from(table)
            .upsert(row, { onConflict: "id", ignoreDuplicates: true });
          if (rowError && !BAD_ROW_CODES.has(rowError.code)) throw rowError;
        }
      }
    }

    write(null);
  })().finally(() => imports.delete(legacy.key + table));

  imports.set(legacy.key + table, job);
  return job;
}

export function useSyncedList<T extends Item, R>(options: SyncedListOptions<T, R>) {
  const { table, userId, label, orderBy = "created_at", ascending = false } = options;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Latest options and list, so the functions below never use stale values.
  // (Declared before the loading effect so it runs first.)
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const itemsRef = useRef<T[]>([]);

  function commit(change: (current: T[]) => T[]) {
    itemsRef.current = change(itemsRef.current);
    setItems(itemsRef.current);
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { legacy, toRow, fromRow } = optionsRef.current;
      if (legacy) {
        try {
          await importLegacy(table, legacy, toRow);
        } catch (error) {
          toast.error(`Couldn't move your saved ${label} to your account yet`, {
            description: (error as { message?: string }).message ?? String(error),
          });
        }
      }

      const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending });
      if (cancelled) return;
      if (error) {
        toast.error(`Couldn't load your ${label}`, { description: error.message });
      } else {
        commit(() => (data ?? []).map((row) => fromRow(row as R & Item)));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [table, userId, label, orderBy, ascending]);

  async function add(fields: Omit<T, "id">) {
    const item = { ...fields, id: crypto.randomUUID() } as T;
    const { error } = await supabase.from(table).insert({ id: item.id, ...optionsRef.current.toRow(item) });
    if (error) {
      toast.error(`Couldn't save to your ${label}`, { description: error.message });
      return null;
    }
    commit((current) => (ascending ? [...current, item] : [item, ...current]));
    return item;
  }

  async function update(id: string, changes: Partial<Omit<T, "id">>) {
    const before = itemsRef.current.find((item) => item.id === id);
    if (!before) return false;
    const after = { ...before, ...changes };
    commit((current) => current.map((item) => (item.id === id ? after : item)));

    const { error } = await supabase.from(table).update(optionsRef.current.toRow(after) as Record<string, unknown>).eq("id", id);
    if (error) {
      commit((current) => current.map((item) => (item.id === id ? before : item)));
      toast.error(`Couldn't update your ${label}`, { description: error.message });
      return false;
    }
    return true;
  }

  async function remove(id: string) {
    const index = itemsRef.current.findIndex((item) => item.id === id);
    if (index === -1) return false;
    const removed = itemsRef.current[index];
    commit((current) => current.filter((item) => item.id !== id));

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      commit((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      toast.error(`Couldn't delete from your ${label}`, { description: error.message });
      return false;
    }
    return true;
  }

  return { items, loading, add, update, remove };
}

// Helpers for reading old localStorage entries.
export const oldText = (value: unknown) => (typeof value === "string" ? value : null);
export const oldNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
