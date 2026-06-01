import { cn } from "@/lib/cn";
import {
  attendanceBadgeClass,
  attendanceStatusForActivity,
  attendanceStatusLabel,
  attendanceSummaryText,
} from "@/lib/attendanceStatus";
import { formatMediumDate } from "@/lib/formatMediumDate";
import type { ActivityRow } from "@/data/programDataQueries";

type Props = {
  activity: Pick<
    ActivityRow,
    | "title"
    | "startsAt"
    | "canceled"
    | "attendanceCompletedAt"
    | "attendancePresentCount"
    | "attendanceTotalCount"
  >;
  compact?: boolean;
  className?: string;
};

/** Visual summary card — admin “thumbnail” for session attendance (9/10 · 90%). */
export function AttendanceSummaryThumbnail({ activity, compact, className }: Props) {
  const status = attendanceStatusForActivity(activity);
  const summary = attendanceSummaryText(
    activity.attendancePresentCount,
    activity.attendanceTotalCount,
  );
  const present = activity.attendancePresentCount ?? 0;
  const total = activity.attendanceTotalCount ?? 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  const ringClass =
    status === "complete"
      ? "ring-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
      : status === "missed"
        ? "ring-red-200 bg-gradient-to-br from-red-50 to-white"
        : "ring-zinc-200 bg-gradient-to-br from-zinc-50 to-white";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl ring-1",
        ringClass,
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold text-jkl-ink", compact ? "text-xs" : "text-sm")}>
            {activity.title}
          </p>
          <p className="text-[10px] text-zinc-500">{formatMediumDate(activity.startsAt)}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            attendanceBadgeClass(status),
          )}
        >
          {attendanceStatusLabel(status)}
        </span>
      </div>
      {summary ? (
        <div className={cn("mt-2", compact ? "mt-1.5" : "mt-3")}>
          <p className={cn("font-bold tabular-nums text-emerald-900", compact ? "text-lg" : "text-2xl")}>
            {present}/{total}
          </p>
          {pct !== null ? (
            <p className="text-xs font-semibold text-emerald-700">{pct}% attended</p>
          ) : null}
        </div>
      ) : (
        <p className={cn("text-zinc-500", compact ? "mt-1 text-[10px]" : "mt-2 text-xs")}>
          {status === "missed" ? "No roll call recorded" : "Roll call not finished"}
        </p>
      )}
    </div>
  );
}
