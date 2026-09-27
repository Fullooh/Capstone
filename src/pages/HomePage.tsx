import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/router";

const steps = [
  {
    title: "1. Enter Your Information",
    body: "Enter information about your school, work, workouts, personal activities, and goals.",
  },
  {
    title: "2. Set Your Priorities",
    body: "Tell My Schedule 360 which areas need more attention or improvement.",
  },
  {
    title: "3. Get Your Schedule",
    body: "Your information is used to create a schedule that fits your needs and priorities.",
  },
];

const features = [
  { title: "School", body: "Track classes, grades, and study tips." },
  { title: "Work", body: "Keep track of your work schedule and availability." },
  { title: "Workout", body: "Plan time for exercise and fitness." },
  { title: "Personal", body: "Organize your personal activities and free time." },
  { title: "Goals", body: "Set and keep track of your personal goals." },
  { title: "Notes", body: "Keep important reminders and information in one place." },
];

export function HomePage() {
  return (
    <main>
      {/* Welcome */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Balance Your Life. Manage Your Time.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          My Schedule 360 helps you manage different parts of your life by creating a schedule
          based on your personal information, priorities, and goals.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg", className: "px-5" })}>
            Get Started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg", className: "px-5" })}
          >
            Login
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-4 border-y bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">How It Works</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            My Schedule 360 uses the information you provide to help create a balanced schedule
            that fits your life.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Manage Your Life in One Place
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
