import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { ActivityCoverImage } from "@/components/ActivityCoverImage";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppModal } from "@/components/ui/AppModal";
import { DATA_PAGE_SIZE } from "@/data/constants";
import {
  createActivityRecord,
  listActivitiesForProgram,
  missingBackendModelsMessage,
  type ActivityRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import {
  classActivityHasField,
  hasAmplifyModel,
  hasStorageInOutputs,
} from "@/lib/amplifyModelMeta";
import {
  datetimeLocalToIso,
  formatMediumDate,
  isoToDatetimeLocalValue,
} from "@/lib/formatMediumDate";
import { uploadActivityCoverFile } from "@/lib/uploadActivityCover";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function useMonthGrid(year: number, monthIndex: number) {
  return useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const daysInMonth = last.getDate();
    const startPad = first.getDay();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, monthIndex, i - startPad + 1);
      cells.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, monthIndex, day), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const lastCell = cells[cells.length - 1]!.date;
      const next = new Date(lastCell);
      next.setDate(next.getDate() + 1);
      cells.push({ date: next, inMonth: false });
    }
    return cells;
  }, [year, monthIndex]);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const LIST_TONES = [
  "from-violet-100 to-violet-50",
  "from-sky-100 to-sky-50",
  "from-amber-100 to-amber-50",
  "from-cyan-100 to-cyan-50",
  "from-indigo-100 to-indigo-50",
  "from-emerald-100 to-emerald-50",
] as const;

export function ActivitiesPage() {
  const routerLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    programId,
    loading: programLoading,
    error: programError,
    cloudDataDisabled,
  } = useProgram();

  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => new Date());
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startsLocal, setStartsLocal] = useState(() =>
    isoToDatetimeLocalValue(new Date().toISOString()),
  );
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const backendHint = missingBackendModelsMessage();
  const activitiesApiReady = hasAmplifyModel("ClassActivity");

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();
  const grid = useMonthGrid(year, monthIndex);
  const label = cursor.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  const loadFirst = useCallback(async () => {
    if (!programId || cloudDataDisabled) {
      setActivities([]);
      setNextToken(undefined);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const res = await listActivitiesForProgram(programId, {
        limit: DATA_PAGE_SIZE,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        setActivities([]);
        setNextToken(undefined);
        return;
      }
      setActivities((res.data ?? []) as ActivityRow[]);
      setNextToken(res.nextToken ?? undefined);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load activities.");
      setActivities([]);
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
      const res = await listActivitiesForProgram(programId, {
        limit: DATA_PAGE_SIZE,
        nextToken,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      setActivities((prev) => [...prev, ...((res.data ?? []) as ActivityRow[])]);
      setNextToken(res.nextToken ?? undefined);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load more.");
    } finally {
      setListLoading(false);
    }
  }, [programId, nextToken, cloudDataDisabled]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst, routerLocation.pathname]);

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
    setStartsLocal(isoToDatetimeLocalValue(new Date().toISOString()));
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  /** Tab filters by time only. Calendar selection highlights days; it does not hide list items. */
  const filteredByTab = useMemo(() => {
    const n = Date.now();
    return activities.filter((a) => {
      const t = new Date(a.startsAt).getTime();
      if (tab === "upcoming") return t >= n;
      return t < n;
    });
  }, [activities, tab]);

  function revokeCoverPreview() {
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function openModal() {
    setSaveError(null);
    setStartsLocal(isoToDatetimeLocalValue(new Date().toISOString()));
    setCoverImageUrl("");
    setCoverFile(null);
    revokeCoverPreview();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaveError(null);
    revokeCoverPreview();
    setCoverFile(null);
  }

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || cloudDataDisabled) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setSaveError("Title is required.");
      return;
    }
    const iso = datetimeLocalToIso(startsLocal);
    if (!iso) {
      setSaveError("Start date and time are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      let coverImageKey: string | undefined;
      if (
        coverFile &&
        hasStorageInOutputs() &&
        classActivityHasField("coverImageKey")
      ) {
        try {
          coverImageKey = await uploadActivityCoverFile(coverFile);
        } catch (uploadErr) {
          setSaveError(
            uploadErr instanceof Error
              ? uploadErr.message
              : "Could not upload photo. Try an image URL instead or redeploy with storage.",
          );
          setSaving(false);
          return;
        }
      }

      const payload: Record<string, string | undefined> = {
        programId,
        title: trimmed,
        startsAt: iso,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (classActivityHasField("coverImageUrl") && coverImageUrl.trim()) {
        payload.coverImageUrl = coverImageUrl.trim();
      }
      if (classActivityHasField("coverImageKey") && coverImageKey) {
        payload.coverImageKey = coverImageKey;
      }

      const created = (await createActivityRecord(payload)) as {
        errors?: { message: string }[];
      };
      if (created.errors?.length) {
        setSaveError(created.errors.map((er) => er.message).join(" "));
        return;
      }
      setTitle("");
      setLocation("");
      setDescription("");
      setCoverImageUrl("");
      setCoverFile(null);
      revokeCoverPreview();
      closeModal();
      await loadFirst();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save activity.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <PageHeader
        title="Class Activities"
        action={
          <button
            type="button"
            onClick={openModal}
            disabled={
              !programId ||
              cloudDataDisabled ||
              !!programError ||
              !activitiesApiReady
            }
            className={cn(
              "rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50",
              (!programId ||
                cloudDataDisabled ||
                !!programError ||
                !activitiesApiReady) &&
                "cursor-not-allowed opacity-50",
            )}
            aria-label="Add activity"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <DataEnvironmentBanner
          cloudDataDisabled={cloudDataDisabled}
          error={programError ?? listError}
        />

        {backendHint ? (
          <div
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="status"
          >
            {backendHint}
          </div>
        ) : null}

        {programLoading ? (
          <p className="mb-4 text-center text-sm text-zinc-500">Loading program…</p>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-jkl-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-jkl-border px-4 py-3">
            <p className="text-sm font-bold text-jkl-ink">{label}</p>
            <div className="flex items-center gap-1">
              <CalendarDays className="mr-1 h-5 w-5 text-zinc-400" aria-hidden />
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-full p-2 text-jkl-navy hover:bg-zinc-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-full p-2 text-jkl-navy hover:bg-zinc-100"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 px-2 pb-2 pt-1 text-center text-xs font-semibold text-zinc-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-zinc-100 px-2 pb-4">
            {grid.map(({ date, inMonth }) => {
              const isSelected = sameDay(date, selected);
              const hasActivity = activities.some((a) =>
                sameDay(new Date(a.startsAt), date),
              );
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cn(
                    "relative flex min-h-10 items-center justify-center bg-white py-2 text-sm font-medium",
                    !inMonth && "text-zinc-300",
                    inMonth && "text-jkl-ink",
                    isSelected &&
                      inMonth &&
                      "relative z-10 rounded-full bg-jkl-navy text-white",
                  )}
                >
                  {date.getDate()}
                  {hasActivity && inMonth && !isSelected ? (
                    <span
                      className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-jkl-accent-red"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-jkl-ink">Your calendar</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Selected day: {formatMediumDate(selected.toISOString())} (dots show
            which days have activities). The list below shows all{" "}
            {tab === "upcoming" ? "upcoming" : "past"} events for your program.
            Paged loads: {DATA_PAGE_SIZE} at a time.
          </p>
          <div className="mt-2 flex gap-6 border-b border-jkl-border">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
              className={cn(
                "pb-3 text-sm font-semibold",
                tab === "upcoming"
                  ? "border-b-2 border-jkl-navy text-jkl-navy"
                  : "text-zinc-400",
              )}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setTab("past")}
              className={cn(
                "pb-3 text-sm font-semibold",
                tab === "past"
                  ? "border-b-2 border-jkl-navy text-jkl-navy"
                  : "text-zinc-400",
              )}
            >
              Past
            </button>
          </div>

          {listLoading && activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>
          ) : null}

          {!listLoading && filteredByTab.length === 0 ? (
            <div className="space-y-2 py-12 text-center">
              <p className="text-2xl font-semibold text-zinc-300">
                No activities for this view
              </p>
              {activities.length > 0 ? (
                <p className="mx-auto max-w-md text-sm text-zinc-500">
                  You have {activities.length} saved for this program—try the{" "}
                  {tab === "upcoming" ? "Past" : "Upcoming"} tab if the times fall
                  there.
                </p>
              ) : activitiesApiReady ? (
                <p className="mx-auto max-w-md text-sm text-zinc-500">
                  Data must match this app&apos;s program and your login. Records
                  created in the AWS console need the same{" "}
                  <code className="rounded bg-zinc-100 px-1">programId</code> as
                  your default program and your Cognito user as owner.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="mt-4 space-y-3 pb-8">
              {filteredByTab.map((a, i) => (
                <li
                  key={a.id}
                  className="flex gap-3 rounded-2xl border border-jkl-border bg-zinc-50/80 p-3"
                >
                  <ActivityCoverImage
                    variant="thumb"
                    coverImageUrl={a.coverImageUrl}
                    coverImageKey={a.coverImageKey}
                    gradientClassName={
                      LIST_TONES[i % LIST_TONES.length] ?? LIST_TONES[0]
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-jkl-ink">{a.title}</p>
                    <p className="text-sm text-zinc-600">
                      {formatMediumDate(a.startsAt)}
                      {a.location ? ` · ${a.location}` : ""}
                    </p>
                    {a.description ? (
                      <p className="mt-1 text-sm text-zinc-500">{a.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {nextToken ? (
            <div className="flex justify-center pb-8">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={listLoading || cloudDataDisabled}
                className="rounded-xl border border-jkl-border bg-white px-4 py-2 text-sm font-semibold text-jkl-navy shadow-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                {listLoading ? "Loading…" : "Load more activities"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <AppModal
        open={modalOpen}
        onClose={closeModal}
        title="New class activity"
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
              form="activity-create-form"
              disabled={saving || !programId || cloudDataDisabled}
              className="rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <form
          id="activity-create-form"
          className="space-y-3"
          onSubmit={submitActivity}
        >
          {saveError ? (
            <p className="text-sm text-red-600" role="alert">
              {saveError}
            </p>
          ) : null}
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="act-title">
              Title
            </label>
            <input
              id="act-title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="act-start">
              Starts
            </label>
            <input
              id="act-start"
              type="datetime-local"
              value={startsLocal}
              onChange={(ev) => setStartsLocal(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label
              className="text-xs font-semibold text-zinc-500"
              htmlFor="act-location"
            >
              Location (optional)
            </label>
            <input
              id="act-location"
              value={location}
              onChange={(ev) => setLocation(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              className="text-xs font-semibold text-zinc-500"
              htmlFor="act-desc"
            >
              Description (optional)
            </label>
            <textarea
              id="act-desc"
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          {classActivityHasField("coverImageUrl") ? (
            <div>
              <label
                className="text-xs font-semibold text-zinc-500"
                htmlFor="act-cover-url"
              >
                Photo link (optional)
              </label>
              <input
                id="act-cover-url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={coverImageUrl}
                onChange={(ev) => setCoverImageUrl(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Use a direct image URL, or upload a file below if storage is
                deployed.
              </p>
            </div>
          ) : null}
          {classActivityHasField("coverImageKey") && hasStorageInOutputs() ? (
            <div>
              <label
                className="text-xs font-semibold text-zinc-500"
                htmlFor="act-cover-file"
              >
                Photo upload (optional)
              </label>
              <input
                id="act-cover-file"
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-jkl-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(ev) => {
                  const f = ev.target.files?.[0] ?? null;
                  setCoverFile(f);
                  setCoverPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return f?.type.startsWith("image/") ? URL.createObjectURL(f) : null;
                  });
                }}
              />
              {coverPreviewUrl && coverFile?.type.startsWith("image/") ? (
                <img
                  src={coverPreviewUrl}
                  alt=""
                  className="mt-2 h-24 w-full rounded-xl object-cover"
                />
              ) : null}
            </div>
          ) : null}
        </form>
      </AppModal>
    </div>
  );
}
