import { BarChart3, MessageSquare, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useUserRoles } from "@/auth/useUserRoles";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppModal } from "@/components/ui/AppModal";
import { DATA_PAGE_SIZE } from "@/data/constants";
import {
  createHighlightRecord,
  createReportFeedback,
  getInstructorProfile,
  hasRuntimeHighlightClient,
  hasRuntimeReportFeedbackClient,
  hasRuntimeWeeklyReportClient,
  listActivitiesForProgram,
  listFeedbackForWeeklyReport,
  listHighlightsForProgram,
  listStudentsForProgram,
  listWeeklyReportsForProgram,
  missingBackendModelsMessage,
  sendReportReminderEmail,
  upsertWeeklyReport,
  type HighlightRow,
  type ReportFeedbackRow,
  type WeeklyReportRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { formatWeekLabel, weekStartMonday } from "@/lib/weekReport";
import { cn } from "@/lib/cn";

type ReportSnapshot = {
  studentsLoaded: number;
  studentsMore: boolean;
  activitiesLoaded: number;
  activitiesMore: boolean;
  highlightsLoaded: number;
  highlightsMore: boolean;
  ranAt: string;
} | null;

const HIGHLIGHT_KINDS = [
  { value: "win", label: "Win / celebration" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "note", label: "General note" },
];

export function ReportsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const {
    programId,
    loading: programLoading,
    error: programError,
    cloudDataDisabled,
  } = useProgram();

  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<ReportSnapshot>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState("note");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backendHint = missingBackendModelsMessage();
  const highlightsApiReady = hasRuntimeHighlightClient();
  const weeklyApiReady = hasRuntimeWeeklyReportClient();
  const feedbackApiReady = hasRuntimeReportFeedbackClient();
  const { admin } = useUserRoles();

  const currentWeek = weekStartMonday();
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportRow[]>([]);
  const [weeklyNotes, setWeeklyNotes] = useState("");
  const [weeklyBusy, setWeeklyBusy] = useState(false);
  const [feedbackByReport, setFeedbackByReport] = useState<Record<string, ReportFeedbackRow[]>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [reminderBusyId, setReminderBusyId] = useState<string | null>(null);
  const [instructorEmail, setInstructorEmail] = useState("");
  const [instructorPhone, setInstructorPhone] = useState("");

  const loadWeekly = useCallback(async () => {
    if (!programId || cloudDataDisabled || !weeklyApiReady) {
      setWeeklyReports([]);
      return;
    }
    try {
      const [repRes, profRes] = await Promise.all([
        listWeeklyReportsForProgram(programId, { limit: 12 }),
        getInstructorProfile(),
      ]);
      if (repRes.errors?.length) return;
      setWeeklyReports(repRes.data ?? []);
      const current = (repRes.data ?? []).find((r) => r.weekStart === currentWeek);
      setWeeklyNotes(current?.instructorNotes ?? "");
      if (profRes.data?.email) setInstructorEmail(profRes.data.email);
      if (profRes.data?.phone) setInstructorPhone(profRes.data.phone);

      if (feedbackApiReady && repRes.data?.length) {
        const entries = await Promise.all(
          repRes.data.map(async (r) => {
            const fb = await listFeedbackForWeeklyReport(r.id);
            return [r.id, fb.data ?? []] as const;
          }),
        );
        setFeedbackByReport(Object.fromEntries(entries));
      }
    } catch {
      /* optional section */
    }
  }, [programId, cloudDataDisabled, weeklyApiReady, feedbackApiReady, currentWeek]);

  useEffect(() => {
    void loadWeekly();
  }, [loadWeekly]);

  async function submitWeeklyReport() {
    if (!programId || cloudDataDisabled || !weeklyApiReady) return;
    setWeeklyBusy(true);
    setReportError(null);
    try {
      const res = (await upsertWeeklyReport({
        programId,
        weekStart: currentWeek,
        status: "submitted",
        instructorNotes: weeklyNotes.trim() || undefined,
        submittedAt: new Date().toISOString(),
      })) as { errors?: { message: string }[] };
      if (res.errors?.length) {
        setReportError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      await loadWeekly();
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setWeeklyBusy(false);
    }
  }

  async function addFeedback(weeklyReportId: string) {
    const message = feedbackDraft[weeklyReportId]?.trim();
    if (!message || !feedbackApiReady) return;
    const res = (await createReportFeedback({
      weeklyReportId,
      message,
      authorRole: "admin",
    })) as { errors?: { message: string }[] };
    if (res.errors?.length) {
      setReportError(res.errors.map((e) => e.message).join(" "));
      return;
    }
    setFeedbackDraft((prev) => ({ ...prev, [weeklyReportId]: "" }));
    await loadWeekly();
  }

  async function remindInstructor(report: WeeklyReportRow, channel: "email" | "sms") {
    setReminderBusyId(report.id);
    setReportError(null);
    const weekLabel = formatWeekLabel(report.weekStart);
    const message = `Reminder: please complete your JKL weekly report for the week of ${weekLabel}.`;

    if (channel === "email") {
      const email = instructorEmail.trim();
      if (!email) {
        setReportError("Instructor email not set. Ask them to fill in Profile → contact info.");
        setReminderBusyId(null);
        return;
      }
      const res = await sendReportReminderEmail({
        programId: report.programId,
        recipientEmail: email,
        message,
        weeklyReportId: report.id,
      });
      if (res.errors?.length) {
        setReportError(res.errors.map((e) => e.message).join(" "));
      }
      setReminderBusyId(null);
      return;
    }

    const phone = instructorPhone.trim().replace(/\D/g, "");
    if (!phone) {
      setReportError("Instructor phone not set. Ask them to fill in Profile → contact info.");
      setReminderBusyId(null);
      return;
    }
    const smsBody = encodeURIComponent(message);
    window.open(`sms:+${phone.startsWith("1") ? phone : `1${phone}`}?body=${smsBody}`, "_self");
    setReminderBusyId(null);
  }

  const loadFirst = useCallback(async () => {
    if (!programId || cloudDataDisabled) {
      setHighlights([]);
      setNextToken(undefined);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const res = await listHighlightsForProgram(programId, {
        limit: DATA_PAGE_SIZE,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        setHighlights([]);
        setNextToken(undefined);
        return;
      }
      setHighlights((res.data ?? []) as HighlightRow[]);
      setNextToken(res.nextToken ?? undefined);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load highlights.");
      setHighlights([]);
      setNextToken(undefined);
    } finally {
      setListLoading(false);
    }
  }, [programId, cloudDataDisabled]);

  const loadMore = useCallback(async () => {
    if (!programId || !nextToken || cloudDataDisabled) return;
    setListLoading(true);
    setListError(null);
    try {
      const res = await listHighlightsForProgram(programId, {
        limit: DATA_PAGE_SIZE,
        nextToken,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      setHighlights((prev) => [...prev, ...((res.data ?? []) as HighlightRow[])]);
      setNextToken(res.nextToken ?? undefined);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load more.");
    } finally {
      setListLoading(false);
    }
  }, [programId, nextToken, cloudDataDisabled]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst, location.pathname]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && programId && !cloudDataDisabled) {
        void loadFirst();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadFirst, programId, cloudDataDisabled]);

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    setModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const runReport = useCallback(async () => {
    if (!programId || cloudDataDisabled) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const [stu, act, hi] = await Promise.all([
        listStudentsForProgram(programId, { limit: DATA_PAGE_SIZE }),
        listActivitiesForProgram(programId, { limit: DATA_PAGE_SIZE }),
        listHighlightsForProgram(programId, { limit: DATA_PAGE_SIZE }),
      ]);
      const err =
        stu.errors?.[0]?.message ??
        act.errors?.[0]?.message ??
        hi.errors?.[0]?.message;
      if (err) {
        setReportError(err);
        setSnapshot(null);
        return;
      }
      setSnapshot({
        studentsLoaded: stu.data?.length ?? 0,
        studentsMore: Boolean(stu.nextToken),
        activitiesLoaded: act.data?.length ?? 0,
        activitiesMore: Boolean(act.nextToken),
        highlightsLoaded: hi.data?.length ?? 0,
        highlightsMore: Boolean(hi.nextToken),
        ranAt: new Date().toISOString(),
      });
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Report failed.");
      setSnapshot(null);
    } finally {
      setReportLoading(false);
    }
  }, [programId, cloudDataDisabled]);

  function openModal() {
    setSaveError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaveError(null);
  }

  async function submitHighlight(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || cloudDataDisabled) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setSaveError("Title is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const created = (await createHighlightRecord({
        programId,
        title: trimmed,
        detail: detail.trim() || undefined,
        kind: kind || undefined,
      })) as { errors?: { message: string }[] };
      if (created.errors?.length) {
        setSaveError(created.errors.map((er) => er.message).join(" "));
        return;
      }
      setTitle("");
      setDetail("");
      setKind("note");
      closeModal();
      await loadFirst();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save highlight.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <PageHeader
        title="Highlights & Reports"
        action={
          <button
            type="button"
            onClick={openModal}
            disabled={
              !programId ||
              cloudDataDisabled ||
              !!programError ||
              !highlightsApiReady
            }
            className={cn(
              "rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50",
              (!programId ||
                cloudDataDisabled ||
                !!programError ||
                !highlightsApiReady) &&
                "cursor-not-allowed opacity-50",
            )}
            aria-label="Add highlight"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="border-b border-jkl-border px-4 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 gap-y-2">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => setRange("weekly")}
              className={cn(
                "border-b-2 pb-3 text-sm font-semibold transition-colors",
                range === "weekly"
                  ? "border-jkl-navy text-jkl-navy"
                  : "border-transparent text-zinc-400 hover:text-zinc-600",
              )}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setRange("monthly")}
              className={cn(
                "border-b-2 pb-3 text-sm font-semibold transition-colors",
                range === "monthly"
                  ? "border-jkl-navy text-jkl-navy"
                  : "border-transparent text-zinc-400 hover:text-zinc-600",
              )}
            >
              Monthly
            </button>
          </div>
          <button
            type="button"
            onClick={() => void runReport()}
            disabled={!programId || cloudDataDisabled || reportLoading}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-jkl-border bg-jkl-cream/80 px-3 py-1.5 text-sm font-semibold text-jkl-navy shadow-sm hover:bg-jkl-cream disabled:opacity-50 md:ml-0"
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            {reportLoading ? "Running…" : "Run report"}
          </button>
        </div>
        <p className="mx-auto max-w-3xl pb-3 text-xs text-zinc-500">
          {range === "weekly"
            ? "Submit your weekly report below. Admins can leave feedback and send reminders."
            : "Monthly summaries aggregate weekly reports and highlights."}
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:px-8">
        <DataEnvironmentBanner
          cloudDataDisabled={cloudDataDisabled}
          error={programError ?? listError ?? reportError}
        />

        {weeklyApiReady && range === "weekly" ? (
          <section className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-jkl-ink">Weekly report</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Week of {formatWeekLabel(currentWeek)}
              {admin ? " · Admin view" : " · Instructor submit"}
            </p>
            {!admin ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={weeklyNotes}
                  onChange={(ev) => setWeeklyNotes(ev.target.value)}
                  rows={4}
                  placeholder="Summarize the week: attendance highlights, student wins, needs attention…"
                  className="w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={weeklyBusy || cloudDataDisabled}
                  onClick={() => void submitWeeklyReport()}
                  className="rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
                >
                  {weeklyBusy ? "Submitting…" : "Submit weekly report"}
                </button>
              </div>
            ) : null}

            <ul className="mt-4 space-y-3">
              {(weeklyReports.length ? weeklyReports : [{ id: "pending", programId: programId ?? "", weekStart: currentWeek, status: "draft" } as WeeklyReportRow]).map((r) => {
                const isPending = r.status !== "submitted";
                const feedback = r.id !== "pending" ? feedbackByReport[r.id] ?? [] : [];
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "rounded-xl border px-4 py-3",
                      isPending ? "border-amber-200 bg-amber-50/80" : "border-emerald-200 bg-emerald-50/50",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-jkl-ink">
                          Week of {formatWeekLabel(r.weekStart)}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                            isPending ? "bg-amber-200 text-amber-950" : "bg-emerald-200 text-emerald-950",
                          )}
                        >
                          {isPending ? "Not submitted" : "Submitted"}
                        </span>
                      </div>
                      {admin && isPending && r.id !== "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={reminderBusyId === r.id}
                            onClick={() => void remindInstructor(r, "email")}
                            className="inline-flex items-center gap-1 rounded-lg bg-jkl-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" aria-hidden />
                            Email remind
                          </button>
                          <button
                            type="button"
                            disabled={reminderBusyId === r.id}
                            onClick={() => void remindInstructor(r, "sms")}
                            className="inline-flex items-center gap-1 rounded-lg border border-jkl-border bg-white px-3 py-1.5 text-xs font-semibold text-jkl-navy hover:bg-zinc-50 disabled:opacity-50"
                          >
                            Text remind
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {r.instructorNotes ? (
                      <p className="mt-2 text-sm text-zinc-700">{r.instructorNotes}</p>
                    ) : null}
                    {admin && r.id !== "pending" ? (
                      <div className="mt-3 border-t border-zinc-200/80 pt-3">
                        <p className="flex items-center gap-1 text-xs font-semibold uppercase text-zinc-500">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                          Admin feedback
                        </p>
                        {feedback.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {feedback.map((f) => (
                              <li key={f.id} className="rounded-lg bg-white px-2 py-1.5 text-sm text-zinc-700 ring-1 ring-zinc-100">
                                {f.message}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-zinc-500">No feedback yet.</p>
                        )}
                        {feedbackApiReady ? (
                          <div className="mt-2 flex gap-2">
                            <input
                              value={feedbackDraft[r.id] ?? ""}
                              onChange={(ev) =>
                                setFeedbackDraft((prev) => ({ ...prev, [r.id]: ev.target.value }))
                              }
                              placeholder="Leave feedback for instructor…"
                              className="min-w-0 flex-1 rounded-lg border border-jkl-border px-2 py-1.5 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => void addFeedback(r.id)}
                              className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
                            >
                              Post
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {backendHint ? (
          <div
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="status"
          >
            {backendHint}
          </div>
        ) : null}

        {programLoading ? (
          <p className="text-center text-sm text-zinc-500">Loading program…</p>
        ) : null}

        {snapshot ? (
          <section
            className="rounded-2xl border border-jkl-border bg-zinc-50/90 p-4 shadow-sm"
            aria-live="polite"
          >
            <p className="text-sm font-bold text-jkl-ink">Latest report snapshot</p>
            <p className="mt-1 text-xs text-zinc-500">
              First page per category ({DATA_PAGE_SIZE} rows max each). Use “Load
              more” in roster or activities for full lists.
            </p>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <li className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-100">
                <span className="text-zinc-500">Students (page)</span>
                <p className="text-lg font-bold tabular-nums text-jkl-navy">
                  {snapshot.studentsLoaded}
                  {snapshot.studentsMore ? "+" : ""}
                </p>
              </li>
              <li className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-100">
                <span className="text-zinc-500">Activities (page)</span>
                <p className="text-lg font-bold tabular-nums text-jkl-navy">
                  {snapshot.activitiesLoaded}
                  {snapshot.activitiesMore ? "+" : ""}
                </p>
              </li>
              <li className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-100">
                <span className="text-zinc-500">Highlights (page)</span>
                <p className="text-lg font-bold tabular-nums text-jkl-navy">
                  {snapshot.highlightsLoaded}
                  {snapshot.highlightsMore ? "+" : ""}
                </p>
              </li>
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-base font-bold text-jkl-ink">Highlights</h2>
          {listLoading && highlights.length === 0 ? (
            <p className="mt-4 text-center text-sm text-zinc-500">Loading…</p>
          ) : null}
          {!listLoading && highlights.length === 0 && programId && !cloudDataDisabled ? (
            <p className="mt-4 rounded-2xl border border-dashed border-jkl-border py-10 text-center text-sm text-zinc-500">
              No highlights yet. Use + to add one.
            </p>
          ) : null}
          <ul className="mt-4 space-y-3">
            {highlights.map((h) => (
              <li
                key={h.id}
                className="rounded-2xl border border-jkl-border bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-jkl-ink">{h.title}</p>
                  {h.kind ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {h.kind.replaceAll("_", " ")}
                    </span>
                  ) : null}
                </div>
                {h.detail ? (
                  <p className="mt-2 text-sm text-zinc-600">{h.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {nextToken ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={listLoading || cloudDataDisabled}
                className="rounded-xl border border-jkl-border bg-white px-4 py-2 text-sm font-semibold text-jkl-navy shadow-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                {listLoading ? "Loading…" : "Load more highlights"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <AppModal
        open={modalOpen}
        onClose={closeModal}
        title="Add highlight"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-jkl-border px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="highlight-create-form"
              disabled={saving || !programId || cloudDataDisabled}
              className="rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <form
          id="highlight-create-form"
          className="space-y-3"
          onSubmit={submitHighlight}
        >
          {saveError ? (
            <p className="text-sm text-red-600" role="alert">
              {saveError}
            </p>
          ) : null}
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="hi-title">
              Title
            </label>
            <input
              id="hi-title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="hi-kind">
              Type
            </label>
            <select
              id="hi-kind"
              value={kind}
              onChange={(ev) => setKind(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            >
              {HIGHLIGHT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="hi-detail">
              Detail (optional)
            </label>
            <textarea
              id="hi-detail"
              value={detail}
              onChange={(ev) => setDetail(ev.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
}
