import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setMessage("Check your email to confirm your account before logging in.");
      }
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <h1 className="text-xl font-medium">
        {mode === "sign-in" ? "Log in" : "Sign up"}
      </h1>

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Loading..." : mode === "sign-in" ? "Log in" : "Sign up"}
      </Button>

      <button
        type="button"
        className="text-sm text-muted-foreground underline"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Log in"}
      </button>
    </form>
  );
}
