import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUserRoles } from "@/auth/useUserRoles";
import { AttendanceSummaryThumbnail } from "@/components/AttendanceSummaryThumbnail";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { DATA_PAGE_SIZE } from "@/data/constants";
import {
  averageAttendancePercent,
  listActivitiesForProgram,
  listStudentsForProgram,
  type ActivityRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import {
  attendanceBadgeClass,
  attendanceStatusForActivity,
  attendanceStatusLabel,
  attendanceSummaryText,
  countMissedActivities,
} from "@/lib/attendanceStatus";
import { consentUiStatus } from "@/lib/consentStatus";
import { formatMediumDate } from "@/lib/formatMediumDate";
import { cn } from "@/lib/cn";

export function AdminDashboardPage() {
  const { admin, loading: rolesLoading } = useUserRoles();
  const { programId, loading: programLoading, error: programError, cloudDataDisabled } =
    useProgram();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [consentComplete, setConsentComplete] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!programId || cloudDataDisabled) return;
    setLoadError(null);
    try {
      const [actRes, stuRes] = await Promise.all([
        listActivitiesForProgram(programId, { limit: DATA_PAGE_SIZE }),
        listStudentsForProgram(programId, { limit: DATA_PAGE_SIZE }),
      ]);
      if (actRes.errors?.length || stuRes.errors?.length) {
        setLoadError(
          [...(actRes.errors ?? []), ...(stuRes.errors ?? [])].map((e) => e.message).join(" "),
        );
        return;
      }
      setActivities(actRes.data ?? []);
      const students = stuRes.data ?? [];
      setStudentCount(students.length);
      setConsentComplete(students.filter((s) => consentUiStatus(s) === "complete").length);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load admin summary.");
    }
  }, [programId, cloudDataDisabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (rolesLoading) {
    return <p className="p-8 text-center text-sm text-zinc-500">Loading…</p>;
  }

  if (!admin) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
        <PageHeader title="Admin dashboard" />
        <p className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-zinc-600">
          Admin access required. Your Cognito account must be in the <strong>Admin</strong> group.
          Instructors use the standard roster and attendance views.
        </p>
        <p className="text-center text-sm">
          <Link to="/profile" className="font-semibold text-jkl-navy hover:underline">
            My contact info
          </Link>
        </p>
      </div>
    );
  }

  const missedDays = countMissedActivities(activities);
  const missedActivities = activities.filter((a) => attendanceStatusForActivity(a) === "missed");
  const completedActivities = activities.filter((a) => a.attendanceCompletedAt);
  const avgPct = averageAttendancePercent(activities);
  const latestCompleted = completedActivities.slice(0, 6);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader title="Admin dashboard" />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 md:px-8">
        <DataEnvironmentBanner cloudDataDisabled={cloudDataDisabled} error={programError ?? loadError} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Students</p>
            <p className="mt-1 text-2xl font-bold text-jkl-ink">{studentCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-emerald-800">Consent complete</p>
            <p className="mt-1 text-2xl font-bold text-emerald-950">
              {consentComplete}/{studentCount}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-red-800">Missed days</p>
            <p className="mt-1 text-2xl font-bold text-red-950">{missedDays}</p>
          </div>
          <div className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Avg attendance</p>
            <p className="mt-1 text-2xl font-bold text-jkl-navy">{avgPct != null ? `${avgPct}%` : "—"}</p>
          </div>
        </div>

        {missedActivities.length > 0 ? (
          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
            <h2 className="text-sm font-bold text-red-950">Attendance missed — action needed</h2>
            <p className="mt-1 text-xs text-red-800">
              {missedActivities.length} session{missedActivities.length === 1 ? "" : "s"} passed without
              full roll call.
            </p>
            <ul className="mt-3 space-y-2">
              {missedActivities.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-red-100"
                >
                  <div>
                    <p className="text-sm font-semibold text-jkl-ink">{a.title}</p>
                    <p className="text-xs text-zinc-500">{formatMediumDate(a.startsAt)}</p>
                  </div>
                  <Link
                    to={`/attendance/${a.id}`}
                    className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                  >
                    Take attendance
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {latestCompleted.length > 0 ? (
          <section className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-jkl-ink">Attendance summary thumbnails</h2>
            <p className="mt-1 text-xs text-zinc-500">
              How many students showed up per completed session (e.g. 9/10 · 90%).
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {latestCompleted.map((a) => (
                <Link key={a.id} to={`/attendance/${a.id}`} className="block hover:opacity-95">
                  <AttendanceSummaryThumbnail activity={a} />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-jkl-ink">All sessions</h2>
          <p className="mt-1 text-xs text-zinc-500">Green = complete · Red = missed</p>
          {programLoading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {activities.slice(0, 15).map((a) => {
                const st = attendanceStatusForActivity(a);
                const summary = attendanceSummaryText(
                  a.attendancePresentCount,
                  a.attendanceTotalCount,
                );
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-jkl-ink">{a.title}</p>
                      <p className="text-xs text-zinc-500">{formatMediumDate(a.startsAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {summary ? (
                        <span className="text-xs font-bold text-emerald-800">{summary}</span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          attendanceBadgeClass(st),
                        )}
                      >
                        {attendanceStatusLabel(st)}
                      </span>
                      <Link
                        to={`/attendance/${a.id}`}
                        className="text-xs font-semibold text-jkl-navy hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-jkl-border bg-white p-4 text-sm text-zinc-600">
          <p className="font-semibold text-jkl-ink">Reports &amp; reminders</p>
          <p className="mt-1">
            Comment on weekly reports and send email or text reminders from{" "}
            <Link to="/reports" className="font-semibold text-jkl-navy hover:underline">
              Reports
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
