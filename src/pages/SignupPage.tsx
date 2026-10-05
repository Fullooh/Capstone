import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Link, navigate } from "@/lib/router";
import { supabase } from "@/lib/supabase";

export function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = data.get("first_name") as string;
    const lastName = data.get("last_name") as string;
    const email = data.get("email") as string;
    const password = data.get("password") as string;

    if (password !== data.get("confirm_password")) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setLoading(false);

    if (error) {
      if (error.code === "over_email_send_rate_limit" || error.status === 429) {
        toast.error("Too many sign-up attempts", {
          description: "We couldn't send a confirmation email right now. Please wait a bit and try again.",
          duration: 10000,
        });
        return;
      }
      setError(error.message);
      toast.error("Sign up failed", { description: error.message });
      return;
    }

    if (!signUpData.session) {
      form.reset();
      toast.success("Account created!", {
        description: `We sent a confirmation link to ${email}. Confirm your email before logging in.`,
        duration: 10000,
      });
      return;
    }

    toast.success("Welcome!", { description: "Your account is ready." });
    navigate("/dashboard");
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

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
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
