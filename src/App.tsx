import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/AuthForm";
import { Subjects } from "@/components/Subjects";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      {session ? (
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-medium">Capstone</h1>
          <p className="text-muted-foreground">
            Logged in as {session.user.email}
          </p>
          <Subjects session={session} />
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Log out
          </Button>
        </div>
      ) : (
        <AuthForm />
      )}
    </div>
  );
}

export default App;
