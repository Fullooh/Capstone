import type { FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

export function LoginPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: sign in with Supabase Auth.
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <section className="rounded-xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Log in to see your personalized schedule.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <FormField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
          <FormField
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <Button type="submit" size="lg" className="mt-2 w-full">
            Login
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign Up
          </Link>
        </p>
      </section>
    </main>
  );
}
