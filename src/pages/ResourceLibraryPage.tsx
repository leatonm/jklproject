import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppModal } from "@/components/ui/AppModal";
import {
  createResourceLibraryLinkRecord,
  hasRuntimeResourceLibraryLinkClient,
  listResourceLibraryLinksForProgram,
  resourceLibraryLinkDeployHint,
  type ResourceLibraryRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { cn } from "@/lib/cn";

const KIND_OPTIONS = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
];

const COLOR_PRESETS = [
  "bg-violet-200",
  "bg-zinc-200",
  "bg-rose-200",
  "bg-sky-200",
  "bg-amber-200",
  "bg-emerald-200",
  "bg-cyan-200",
  "bg-indigo-200",
];

export function ResourceLibraryPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    programId,
    loading: programLoading,
    error: programError,
    cloudDataDisabled,
  } = useProgram();

  const [rows, setRows] = useState<ResourceLibraryRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("article");
  const [color, setColor] = useState(COLOR_PRESETS[0]!);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const deployHint = resourceLibraryLinkDeployHint();
  const apiReady = hasRuntimeResourceLibraryLinkClient();

  const loadFirst = useCallback(async () => {
    if (!programId || cloudDataDisabled) {
      setRows([]);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const res = await listResourceLibraryLinksForProgram(programId, {
        limit: 200,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        setRows([]);
        return;
      }
      setRows((res.data ?? []) as ResourceLibraryRow[]);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load resource links.");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [programId, cloudDataDisabled]);

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

  function openModal() {
    setSaveError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaveError(null);
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || cloudDataDisabled) return;
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    if (!trimmedTitle) {
      setSaveError("Title is required.");
      return;
    }
    if (!trimmedUrl) {
      setSaveError("URL is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const existing = await listResourceLibraryLinksForProgram(programId, {
        limit: 500,
      });
      if (existing.errors?.length) {
        setSaveError(existing.errors.map((er) => er.message).join(" "));
        return;
      }
      const nextOrder =
        (existing.data ?? []).reduce(
          (m, r) => Math.max(m, r.orderIndex ?? 0),
          -1,
        ) + 1;

      const created = (await createResourceLibraryLinkRecord({
        programId,
        title: trimmedTitle,
        url: trimmedUrl,
        subtitle: subtitle.trim() || undefined,
        kind: kind || undefined,
        color: color || undefined,
        orderIndex: nextOrder,
      })) as { errors?: { message: string }[] };
      if (created.errors?.length) {
        setSaveError(created.errors.map((er) => er.message).join(" "));
        return;
      }
      setTitle("");
      setSubtitle("");
      setUrl("");
      setKind("article");
      setColor(COLOR_PRESETS[0]!);
      closeModal();
      await loadFirst();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save resource link.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <PageHeader
        title="Resource library"
        action={
          <button
            type="button"
            onClick={openModal}
            disabled={
              !programId ||
              cloudDataDisabled ||
              !!programError ||
              !apiReady
            }
            className={cn(
              "rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50",
              (!programId || cloudDataDisabled || !!programError || !apiReady) &&
                "cursor-not-allowed opacity-50",
            )}
            aria-label="Add resource link"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 md:px-8">
        <DataEnvironmentBanner
          cloudDataDisabled={cloudDataDisabled}
          error={programError ?? listError}
        />
        {deployHint ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {deployHint}
          </p>
        ) : null}
        {programLoading && !cloudDataDisabled ? (
          <p className="text-sm text-zinc-500">Loading program…</p>
        ) : null}
        {!listLoading && rows.length === 0 && !listError && apiReady && !cloudDataDisabled ? (
          <p className="rounded-2xl border border-dashed border-jkl-border bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600">
            No links yet. Use + to add articles or videos for the home Resource Library
            carousel.
          </p>
        ) : null}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex gap-3 overflow-hidden rounded-2xl border border-jkl-border bg-zinc-50/80 shadow-sm"
            >
              <div className={cn("w-3 shrink-0", r.color ?? "bg-zinc-300")} />
              <div className="min-w-0 flex-1 py-4 pr-4">
                <p className="font-semibold text-jkl-ink">{r.title}</p>
                {r.subtitle ? (
                  <p className="mt-1 text-sm text-zinc-600">{r.subtitle}</p>
                ) : null}
                <p className="mt-2 truncate text-xs text-zinc-500">{r.url}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {r.kind === "video" ? "Video" : "Article"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <AppModal
        open={modalOpen}
        onClose={closeModal}
        title="Add resource link"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="resource-link-form"
              disabled={saving}
              className="rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-jkl-navy-muted disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <form id="resource-link-form" className="space-y-4" onSubmit={submitLink}>
          {saveError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p>
          ) : null}
          <div>
            <label htmlFor="rl-title" className="text-xs font-medium text-zinc-500">
              Title
            </label>
            <input
              id="rl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="rl-subtitle" className="text-xs font-medium text-zinc-500">
              Subtitle (optional)
            </label>
            <input
              id="rl-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="rl-url" className="text-xs font-medium text-zinc-500">
              URL
            </label>
            <input
              id="rl-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
              placeholder="https://"
            />
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500">Kind</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    kind === k.value
                      ? "bg-jkl-navy text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500">Card color</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn(
                    "h-9 w-9 rounded-lg ring-2 ring-offset-2",
                    c,
                    color === c ? "ring-jkl-navy" : "ring-transparent",
                  )}
                />
              ))}
            </div>
          </div>
        </form>
      </AppModal>
    </div>
  );
}
