
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const startHour = 7;
const endHour = 24;
const slotHeight = 60;

function formatTime(hour: number) {
  const h = Math.floor(hour);
  const minutes = Math.round((hour - h) * 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function SchedulePage() {
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  );

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            My Schedule
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your week, organized hour by hour.
          </p>
        </div>

        <Button onClick={() => window.print()} variant="outline">
          Print Schedule
        </Button>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[1050px]">
            {/* Day headers */}
            <div
              className="grid border-b bg-muted/40"
              style={{
                gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
              }}
            >
              <div className="border-r p-3 text-xs text-muted-foreground">
                Time
              </div>

              {days.map((day) => (
                <div
                  key={day}
                  className="border-r p-3 text-center text-sm font-semibold last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Empty calendar grid */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))",
              }}
            >
              {/* Time labels */}
              <div className="border-r">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="box-border border-b px-2 pt-1 text-right text-xs text-muted-foreground"
                    style={{ height: slotHeight }}
                  >
                    {formatTime(hour)}
                  </div>
                ))}

                {/* Midnight boundary */}
                <div className="px-2 pt-1 text-right text-xs text-muted-foreground">
                  12:00 AM
                </div>
              </div>

              {/* Seven day columns */}
              {days.map((day) => (
                <div
                  key={day}
                  className="border-r last:border-r-0"
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b"
                      style={{ height: slotHeight }}
                    />
                  ))}

                  {/* Activities will be displayed here later */}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <p className="mt-4 text-sm text-muted-foreground">
        Your schedule will appear here once activities are added from your
        other sections.
      </p>
    </main>
  );
}
