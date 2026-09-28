import { useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Link, navigate } from "@/lib/router";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/dashboard");
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
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
