import { LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { HorizontalDragScroller } from "@/components/HorizontalDragScroller";
import { LogoMark } from "@/components/LogoMark";
import { cn } from "@/lib/cn";

const activities = [
  {
    id: "1",
    title: "Honourable Alumni Presenta…",
    place: "Classroom 123",
    date: "Sun, Oct 27",
    tone: "from-violet-100 to-violet-50",
  },
  {
    id: "2",
    title: "Gym Class",
    place: "Gym Location 1",
    date: "Thu, Oct 24",
    tone: "from-sky-100 to-sky-50",
  },
  {
    id: "3",
    title: "Food Bank",
    place: "321 Ave",
    date: "Mon, Sep 16",
    tone: "from-amber-100 to-amber-50",
  },
  {
    id: "4",
    title: "Example Class 4",
    place: "gym",
    date: "Wed, Sep 11",
    tone: "from-cyan-100 to-cyan-50",
  },
  {
    id: "5",
    title: "Example Class 5",
    place: "Room 100",
    date: "Mon, Sep 9",
    tone: "from-indigo-100 to-indigo-50",
  },
  {
    id: "6",
    title: "Example Class 6",
    place: "Local Park",
    date: "Wed, Sep 4",
    tone: "from-emerald-100 to-emerald-50",
  },
  {
    id: "7",
    title: "Example Class 7",
    place: "School Field",
    date: "Fri, Aug 30",
    tone: "from-lime-100 to-lime-50",
  },
  {
    id: "8",
    title: "Example Class 8",
    place: "Room 10",
    date: "Tue, Aug 27",
    tone: "from-orange-100 to-orange-50",
  },
  {
    id: "9",
    title: "Example Class 9",
    place: "123 Main",
    date: "Thu, Aug 22",
    tone: "from-rose-100 to-rose-50",
  },
  {
    id: "10",
    title: "Community Kitchen",
    place: "Cafeteria A",
    date: "Sat, Aug 17",
    tone: "from-fuchsia-100 to-fuchsia-50",
  },
  {
    id: "11",
    title: "Hiking Club",
    place: "Trailhead Lot",
    date: "Sun, Aug 11",
    tone: "from-teal-100 to-teal-50",
  },
];

const resources = [
  { id: "1", title: "Mental Health Monday", subtitle: "Link below", color: "bg-violet-200" },
  { id: "2", title: "February", subtitle: "Newsletter", color: "bg-zinc-200" },
  { id: "3", title: "JKL history intro", subtitle: "Video", color: "bg-rose-200" },
];

/** One width for both carousels; cards use the same shell height below. */
const HOME_CARD_SLIDE = "w-[min(280px,85vw)]";

const homeCardShell =
  "flex h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-jkl-border bg-white shadow-sm";

type MetricMode = "students" | "attendance";

export function HomePage() {
  const { signOutUser } = useAuth();
  const [metric, setMetric] = useState<MetricMode>("students");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-white/10 bg-jkl-banner text-white">
        <div className="flex items-center justify-between px-4 pt-3 md:px-6">
          <LogoMark size={36} className="shrink-0 rounded-lg bg-white/10 p-1" />
          <p className="min-w-0 flex-1 truncate px-2 text-center text-sm font-semibold">
            JKL App Demo Location
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              to="/reports"
              className="hidden rounded-full px-2 py-1 text-xs font-semibold text-white/90 hover:bg-white/10 sm:inline"
            >
              Reports
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-white/90 hover:bg-white/10 md:hidden"
              aria-label="Sign out"
              onClick={() => void signOutUser()}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-2 pt-4 md:px-6">
          <div className="mx-auto flex max-w-md rounded-full bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setMetric("students")}
              className={cn(
                "flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors",
                metric === "students"
                  ? "bg-jkl-accent-red text-white"
                  : "text-white/80 hover:text-white",
              )}
            >
              Total Students
            </button>
            <button
              type="button"
              onClick={() => setMetric("attendance")}
              className={cn(
                "flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors",
                metric === "attendance"
                  ? "bg-jkl-accent-red text-white"
                  : "text-white/80 hover:text-white",
              )}
            >
              Avg. Attendance
            </button>
          </div>
          <div className="py-8 text-center">
            <p className="text-5xl font-bold tabular-nums">
              {metric === "students" ? "7" : "—"}
            </p>
            <p className="mt-1 text-sm text-white/80">
              {metric === "students"
                ? "Students Enrolled"
                : "Average across programs"}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 md:px-8">
        <section className="rounded-2xl bg-zinc-50/90 p-3 ring-1 ring-zinc-100">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-jkl-ink">Upcoming Activities</h2>
            <Link
              to="/activities"
              className="text-sm font-semibold text-jkl-navy hover:underline"
            >
              See all
            </Link>
          </div>
          <HorizontalDragScroller
            ariaLabel="Upcoming activities"
            slideClassName={HOME_CARD_SLIDE}
          >
            {activities.map((a) => (
              <article key={a.id} className={homeCardShell}>
                <div
                  className={cn(
                    "flex h-28 shrink-0 items-end justify-center bg-gradient-to-br px-4 pb-3",
                    a.tone,
                  )}
                >
                  <div className="h-16 w-full rounded-lg bg-white/40" />
                </div>
                <div className="relative flex min-h-0 flex-1 flex-col justify-between p-4">
                  <div className="min-w-0 pr-14">
                    <p className="line-clamp-2 font-semibold leading-snug text-jkl-ink">
                      {a.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-zinc-500">{a.place}</p>
                  </div>
                  <span className="absolute bottom-4 right-4 inline-flex max-w-[calc(100%-2rem)] truncate rounded-full bg-jkl-accent-red px-2.5 py-1 text-xs font-semibold text-white">
                    {a.date}
                  </span>
                </div>
              </article>
            ))}
          </HorizontalDragScroller>
        </section>

        <section className="rounded-2xl bg-zinc-50/90 p-3 ring-1 ring-zinc-100">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-jkl-ink">JKL Resource Library</h2>
            <span className="text-sm font-semibold text-zinc-400">See all</span>
          </div>
          <HorizontalDragScroller
            ariaLabel="JKL resource library"
            slideClassName={HOME_CARD_SLIDE}
          >
            {resources.map((r) => (
              <article key={r.id} className={homeCardShell}>
                <div className={cn("h-28 shrink-0", r.color)} />
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 text-center">
                  <div className="min-w-0 w-full">
                    <p className="line-clamp-2 font-semibold leading-snug text-jkl-ink">
                      {r.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{r.subtitle}</p>
                  </div>
                </div>
              </article>
            ))}
          </HorizontalDragScroller>
        </section>

        <p className="pb-4 text-center text-sm text-zinc-500 md:hidden">
          <Link to="/reports" className="font-semibold text-jkl-navy hover:underline">
            Open highlights &amp; reports
          </Link>
        </p>
      </div>
    </div>
  );
}
