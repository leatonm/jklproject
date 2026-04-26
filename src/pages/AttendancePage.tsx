import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { DATA_PAGE_SIZE } from "@/data/constants";
import {
  getClassActivityById,
  hasRuntimeAttendanceRecordClient,
  listAttendanceRecordsForActivity,
  listStudentsForProgram,
  upsertAttendanceRecord,
  type ActivityRow,
  type AttendanceRow,
  type StudentRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { formatMediumDate } from "@/lib/formatMediumDate";
import { cn } from "@/lib/cn";

export function AttendancePage() {
  const { activityId } = useParams<{ activityId: string }>();
  const { programId, loading: programLoading, error: programError, cloudDataDisabled } =
    useProgram();

  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const attendanceApi = hasRuntimeAttendanceRecordClient();

  const byStudent = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of attendance) m.set(r.studentId, r.status);
    return m;
  }, [attendance]);

  const load = useCallback(async () => {
    if (!activityId || !programId || cloudDataDisabled) {
      setActivity(null);
      setStudents([]);
      setAttendance([]);
      return;
    }
    setLoadError(null);
    try {
      const actRes = await getClassActivityById(activityId);
      if (actRes.errors?.length) {
        setLoadError(actRes.errors.map((e) => e.message).join(" "));
        return;
      }
      const act = actRes.data;
      if (!act || act.programId !== programId) {
        setLoadError("This class activity was not found for your program.");
        setActivity(null);
        return;
      }
      setActivity(act);
      const [stu, att] = await Promise.all([
        listStudentsForProgram(programId, { limit: DATA_PAGE_SIZE }),
        attendanceApi
          ? listAttendanceRecordsForActivity(activityId)
          : Promise.resolve({ data: [], errors: undefined }),
      ]);
      if (stu.errors?.length) {
        setLoadError(stu.errors.map((e) => e.message).join(" "));
        return;
      }
      if (att.errors?.length) {
        setLoadError(att.errors.map((e) => e.message).join(" "));
        return;
      }
      setStudents(stu.data ?? []);
      setAttendance(att.data ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load attendance.");
    }
  }, [activityId, programId, cloudDataDisabled, attendanceApi]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(studentId: string, status: string) {
    if (!activityId || !programId || !attendanceApi) return;
    setBusyId(studentId);
    setLoadError(null);
    try {
      const res = (await upsertAttendanceRecord({
        programId,
        classActivityId: activityId,
        studentId,
        status,
      })) as { errors?: { message: string }[] };
      if (res.errors?.length) {
        setLoadError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      await load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader
        title="Attendance"
        action={
          <Link
            to="/activities"
            className="text-sm font-semibold text-jkl-navy hover:underline"
          >
            Back to activities
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 md:px-8">
        <DataEnvironmentBanner
          cloudDataDisabled={cloudDataDisabled}
          error={programError ?? loadError}
        />
        {!attendanceApi && !cloudDataDisabled ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Deploy the latest backend so <code className="rounded bg-amber-100/80 px-1">AttendanceRecord</code>{" "}
            is available, then refresh <code className="rounded bg-amber-100/80 px-1">amplify_outputs.json</code>.
          </p>
        ) : null}
        {programLoading ? (
          <p className="text-center text-sm text-zinc-500">Loading program…</p>
        ) : null}
        {activity ? (
          <div className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
            <p className="text-lg font-bold text-jkl-ink">{activity.title}</p>
            <p className="mt-1 text-sm text-zinc-600">
              {formatMediumDate(activity.startsAt)}
              {activity.location ? ` · ${activity.location}` : ""}
            </p>
            {activity.canceled ? (
              <p className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Canceled session
              </p>
            ) : null}
          </div>
        ) : null}

        <ul className="space-y-2 pb-8">
          {students.map((s) => {
            const current = byStudent.get(s.id) ?? "unmarked";
            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-jkl-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-jkl-ink">{s.name}</p>
                  {s.grade ? (
                    <p className="text-xs text-zinc-500">Grade {s.grade}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["present", "absent", "unmarked"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={busyId === s.id || !attendanceApi || cloudDataDisabled}
                      onClick={() => void setStatus(s.id, st)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                        current === st
                          ? "bg-jkl-navy text-white"
                          : "border border-jkl-border bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
                        (busyId === s.id || !attendanceApi || cloudDataDisabled) &&
                          "opacity-50",
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {students.length === 0 && activity && !loadError ? (
          <p className="text-center text-sm text-zinc-500">No students on this roster yet.</p>
        ) : null}
      </div>
    </div>
  );
}
