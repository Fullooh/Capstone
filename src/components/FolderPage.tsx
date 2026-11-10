import type { ReactNode } from "react";
import { Link } from "@/lib/router";

// Shared building blocks for the "folder" style pages (Personal, Workout, Work, ...):
// header card, overview stats, folder sidebar, section intro and empty states.

export const inputClass =
  "mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary";

export function FolderPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>

        {children}

        <footer className="mt-12 border-t py-6 text-center text-xs text-muted-foreground">
          My Schedule 360 · Balance your life. Manage your time.
        </footer>
      </div>
    </main>
  );
}

export function FolderPageLoading({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}

export function PageHeader({
  icon,
  iconClassName,
  eyebrow,
  title,
  description,
}: {
  icon: string;
  iconClassName: string; // e.g. "bg-emerald-100"
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${iconClassName}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-primary">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </div>
    </header>
  );
}

export type Stat = {
  label: string;
  value: ReactNode;
  icon: string;
  description: string;
};

export function OverviewStats({
  title,
  description,
  stats,
}: {
  title: string;
  description: string;
  stats: Stat[];
}) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export type FolderNavItem<T extends string> = {
  id: T;
  label: string;
  icon: string;
  description: string;
};

export function FolderLayout<T extends string>({
  title,
  items,
  active,
  onSelect,
  children,
}: {
  title: string;
  items: FolderNavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
      <aside className="h-fit rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="px-3 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>

        <nav className="space-y-2">
          {items.map((item) => {
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70 text-lg">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span
                    className={`mt-1 block text-xs ${
                      selected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        {children}
      </section>
    </div>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-5 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function Chip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
