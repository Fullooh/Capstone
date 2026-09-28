import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { supabase } from "@/lib/supabase";

export function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session),
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b bg-background">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          My Schedule 360
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Home
          </Link>
          <a href="/#how-it-works" className={buttonVariants({ variant: "ghost" })}>
            How it Works
          </a>
          {session ? (
            <Link href="/dashboard" className={buttonVariants()}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                Login
              </Link>
              <Link href="/signup" className={buttonVariants()}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
