import { LogOut, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ActivityCoverImage } from "@/components/ActivityCoverImage";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { HorizontalDragScroller } from "@/components/HorizontalDragScroller";
import { LogoMark } from "@/components/LogoMark";
import { DATA_PAGE_SIZE } from "@/data/constants";
import { resourceLibraryItems } from "@/data/resourceLibrary";
import {
  listStudentsForProgram,
  listUpcomingActivitiesForProgram,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { formatMediumDate } from "@/lib/formatMediumDate";
import { cn } from "@/lib/cn";

const TONES = [
  "from-violet-100 to-violet-50",
  "from-sky-100 to-sky-50",
  "from-amber-100 to-amber-50",
  "from-cyan-100 to-cyan-50",
  "from-indigo-100 to-indigo-50",
  "from-emerald-100 to-emerald-50",
  "from-lime-100 to-lime-50",
  "from-orange-100 to-orange-50",
  "from-rose-100 to-rose-50",
  "from-fuchsia-100 to-fuchsia-50",
  "from-teal-100 to-teal-50",
] as const;

/** One width for both carousels; cards use the same shell height below. */
const HOME_CARD_SLIDE = "w-[min(280px,85vw)]";

const homeCardShell =
  "flex h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-jkl-border bg-white shadow-sm";

type MetricMode = "students" | "attendance";

type ActivityPreview = {
  id: string;
  title: string;
  location?: string | null;
  startsAt: string;
  coverImageUrl?: string | null;
  coverImageKey?: string | null;
};

export function HomePage() {
  const { signOutUser } = useAuth();
  const {
    programId,
    loading: programLoading,
    error: programError,
    cloudDataDisabled,
  } = useProgram();
  const [metric, setMetric] = useState<MetricMode>("students");
  const [studentCount, setStudentCount] = useState<string>("—");
  const [activitiesPreview, setActivitiesPreview] = useState<ActivityPreview[]>([]);
  const [homeLoadError, setHomeLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!programId || cloudDataDisabled) {
        setStudentCount("—");
        setActivitiesPreview([]);
        setHomeLoadError(null);
        return;
      }
      setHomeLoadError(null);
      try {
        const [stu, act] = await Promise.all([
          listStudentsForProgram(programId, { limit: DATA_PAGE_SIZE }),
          listUpcomingActivitiesForProgram(programId, 12),
        ]);
        const err = stu.errors?.[0]?.message ?? act.errors?.[0]?.message;
        if (err) {
          if (!cancelled) setHomeLoadError(err);
          return;
        }
        const n = stu.data?.length ?? 0;
        const more = Boolean(stu.nextToken);
        if (!cancelled) {
          setStudentCount(n === 0 && !more ? "0" : `${n}${more ? "+" : ""}`);
        }
        const upcoming = (act.data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          location: row.location,
          startsAt: row.startsAt,
          coverImageUrl: row.coverImageUrl,
          coverImageKey: row.coverImageKey,
        }));
        if (!cancelled) setActivitiesPreview(upcoming);
      } catch (e) {
        if (!cancelled) {
          setHomeLoadError(e instanceof Error ? e.message : "Failed to load home data.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [programId, cloudDataDisabled]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-white/10 bg-jkl-banner text-white">
        <div className="flex items-center justify-between px-4 pt-3 md:px-6">
          <LogoMark size={36} className="shrink-0 rounded-lg bg-white/10 p-1" />
          <p className="min-w-0 flex-1 truncate px-2 text-center text-sm font-semibold">
            JKL App Demo Location
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            <Link
              to="/quick-add"
              className="rounded-full p-2 text-white/90 hover:bg-white/10"
              aria-label="Quick add"
            >
              <Plus className="h-5 w-5" />
            </Link>
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
              {metric === "students"
                ? programLoading && !cloudDataDisabled
                  ? "…"
                  : studentCount
                : "—"}
            </p>
            <p className="mt-1 text-sm text-white/80">
              {metric === "students"
                ? cloudDataDisabled
                  ? "Sign in with Cognito to load roster counts"
                  : "Students on first page (tap Reports → Run report for more)"
                : "Average attendance when the attendance pipeline is connected"}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 md:px-8">
        <div className="max-w-3xl">
          <DataEnvironmentBanner
            cloudDataDisabled={cloudDataDisabled}
            error={programError ?? homeLoadError}
          />
        </div>

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
          {activitiesPreview.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              {cloudDataDisabled
                ? "Connect to Cognito to load activities from the cloud."
                : "No upcoming activities in the next loaded window. Add one from Class Activities."}
            </p>
          ) : (
            <HorizontalDragScroller
              ariaLabel="Upcoming activities"
              slideClassName={HOME_CARD_SLIDE}
            >
              {activitiesPreview.map((a, i) => (
                <article key={a.id} className={homeCardShell}>
                  <ActivityCoverImage
                    coverImageUrl={a.coverImageUrl}
                    coverImageKey={a.coverImageKey}
                    gradientClassName={TONES[i % TONES.length] ?? TONES[0]}
                  />
                  <div className="relative flex min-h-0 flex-1 flex-col justify-between p-4">
                    <div className="min-w-0 pr-14">
                      <p className="line-clamp-2 font-semibold leading-snug text-jkl-ink">
                        {a.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                        {a.location ?? "Location TBD"}
                      </p>
                    </div>
                    <span className="absolute bottom-4 right-4 inline-flex max-w-[calc(100%-2rem)] truncate rounded-full bg-jkl-accent-red px-2.5 py-1 text-xs font-semibold text-white">
                      {formatMediumDate(a.startsAt)}
                    </span>
                  </div>
                </article>
              ))}
            </HorizontalDragScroller>
          )}
        </section>

        <section className="rounded-2xl bg-zinc-50/90 p-3 ring-1 ring-zinc-100">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-jkl-ink">JKL Resource Library</h2>
            <span className="text-sm font-semibold text-zinc-400">
              {resourceLibraryItems.length} links
            </span>
          </div>
          <HorizontalDragScroller
            ariaLabel="JKL resource library"
            slideClassName={HOME_CARD_SLIDE}
          >
            {resourceLibraryItems.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(homeCardShell, "text-left no-underline")}
              >
                <div className={cn("h-28 shrink-0", r.color)} />
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 text-center">
                  <div className="min-w-0 w-full">
                    <p className="line-clamp-2 font-semibold leading-snug text-jkl-ink">
                      {r.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                      {r.subtitle}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-jkl-navy">
                      {r.kind === "video" ? "Video" : "Article"} · open
                    </p>
                  </div>
                </div>
              </a>
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
