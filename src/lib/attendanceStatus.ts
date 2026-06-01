import type { ActivityRow } from "@/data/programDataQueries";

export type ActivityAttendanceUiStatus = "complete" | "missed" | "upcoming" | "canceled";

/** Green = roll call done; red = session day passed with no completion. */
export function attendanceStatusForActivity(
  activity: Pick<
    ActivityRow,
    "startsAt" | "canceled" | "attendanceCompletedAt" | "attendancePresentCount" | "attendanceTotalCount"
  >,
  now = Date.now(),
): ActivityAttendanceUiStatus {
  if (activity.canceled) return "canceled";
  if (activity.attendanceCompletedAt) return "complete";

  const startMs = new Date(activity.startsAt).getTime();
  const endOfDayMs = new Date(activity.startsAt);
  endOfDayMs.setHours(23, 59, 59, 999);

  if (now > endOfDayMs.getTime()) return "missed";
  if (startMs > now) return "upcoming";
  return "missed";
}

export function attendanceStatusLabel(s: ActivityAttendanceUiStatus): string {
  switch (s) {
    case "complete":
      return "Attendance complete";
    case "missed":
      return "Attendance missed";
    case "upcoming":
      return "Upcoming";
    default:
      return "Canceled";
  }
}

export function attendanceBadgeClass(s: ActivityAttendanceUiStatus): string {
  switch (s) {
    case "complete":
      return "bg-emerald-100 text-emerald-900";
    case "missed":
      return "bg-red-100 text-red-900";
    case "upcoming":
      return "bg-zinc-100 text-zinc-700";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

export function attendanceSummaryText(
  present: number | null | undefined,
  total: number | null | undefined,
): string | null {
  if (total == null || total <= 0) return null;
  const p = present ?? 0;
  const pct = Math.round((p / total) * 100);
  return `${p}/${total} present (${pct}%)`;
}

export function countMissedActivities(
  activities: Pick<ActivityRow, "startsAt" | "canceled" | "attendanceCompletedAt">[],
): number {
  return activities.filter((a) => attendanceStatusForActivity(a) === "missed").length;
}
