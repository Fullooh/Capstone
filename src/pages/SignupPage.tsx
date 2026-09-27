import { useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

export function SignupPage() {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm_password")) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    // TODO: create the account with Supabase Auth.
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <section className="rounded-xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create Your Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an account to start building your personalized schedule.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="first-name"
              name="first_name"
              label="First Name"
              placeholder="Enter your first name"
              autoComplete="given-name"
              required
            />
            <FormField
              id="last-name"
              name="last_name"
              label="Last Name"
              placeholder="Enter your last name"
              autoComplete="family-name"
              required
            />
          </div>
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
            placeholder="Create a password"
            autoComplete="new-password"
            required
          />
          <FormField
            id="confirm-password"
            name="confirm_password"
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="mt-2 w-full">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
