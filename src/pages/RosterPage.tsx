import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppModal } from "@/components/ui/AppModal";
import { DATA_PAGE_SIZE } from "@/data/constants";
import {
  createStudentRecord,
  listStudentsForProgram,
  type StudentRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { formatMediumDate } from "@/lib/formatMediumDate";
import { studentHasField } from "@/lib/amplifyModelMeta";
import { cn } from "@/lib/cn";

export function RosterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const addStudentRef = useRef<HTMLButtonElement>(null);
  const {
    programId,
    loading: programLoading,
    error: programError,
    cloudDataDisabled,
  } = useProgram();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadFirst = useCallback(async () => {
    if (!programId || cloudDataDisabled) {
      setStudents([]);
      setNextToken(undefined);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const res = await listStudentsForProgram(programId, {
        limit: DATA_PAGE_SIZE,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        setStudents([]);
        setNextToken(undefined);
        return;
      }
      setStudents((res.data ?? []) as StudentRow[]);
      setNextToken(res.nextToken ?? undefined);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load roster.");
      setStudents([]);
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
      const res = await listStudentsForProgram(programId, {
        limit: DATA_PAGE_SIZE,
        nextToken,
      });
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      setStudents((prev) => [...prev, ...((res.data ?? []) as StudentRow[])]);
      setNextToken(res.nextToken ?? undefined);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load more.");
    } finally {
      setListLoading(false);
    }
  }, [programId, nextToken, cloudDataDisabled]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    setModalOpen(true);
    requestAnimationFrame(() => {
      addStudentRef.current?.focus({ preventScroll: false });
      addStudentRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
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

  async function submitStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || cloudDataDisabled) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError("Name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createStudentRecord({
        programId,
        name: trimmed,
        grade: grade.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (created.errors?.length) {
        setSaveError(created.errors.map((er) => er.message).join(" "));
        return;
      }
      setName("");
      setGrade("");
      setNotes("");
      closeModal();
      await loadFirst();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save student.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader
        title="Student Roster"
        showReportsLink
        action={
          <button
            ref={addStudentRef}
            type="button"
            onClick={openModal}
            disabled={!programId || cloudDataDisabled || !!programError}
            className={cn(
              "rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50",
              (!programId || cloudDataDisabled || !!programError) &&
                "cursor-not-allowed opacity-50",
            )}
            aria-label="Add enrolled student"
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

        {programLoading ? (
          <p className="text-center text-sm text-zinc-500">Loading program…</p>
        ) : null}

        {!programLoading && !programId && !cloudDataDisabled && !programError ? (
          <p className="text-center text-sm text-zinc-500">No program available.</p>
        ) : null}

        {listLoading && students.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">Loading roster…</p>
        ) : null}

        {!listLoading && students.length === 0 && programId && !cloudDataDisabled ? (
          <p className="rounded-2xl border border-dashed border-jkl-border bg-white px-4 py-10 text-center text-sm text-zinc-500">
            No students yet. Use the + button to add an enrolled student.
          </p>
        ) : null}

        {students.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-jkl-ink">{s.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {s.grade ? (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {s.grade}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {s.enrolledAt || s.createdAt
                      ? `Added ${formatMediumDate((s.enrolledAt ?? s.createdAt) as string)}`
                      : "Enrolled date TBD"}
                  </span>
                </div>
              </div>
            </div>
            {s.notes ? (
              <p className="mt-3 text-sm text-zinc-600">{s.notes}</p>
            ) : null}
            <p className="mt-3 text-xs text-zinc-400">
              Attendance averages and e-signatures will connect here per the product
              roadmap.
            </p>
          </article>
        ))}

        {nextToken ? (
          <div className="flex justify-center pb-4">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={listLoading || cloudDataDisabled}
              className="rounded-xl border border-jkl-border bg-white px-4 py-2 text-sm font-semibold text-jkl-navy shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {listLoading ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>

      <AppModal
        open={modalOpen}
        onClose={closeModal}
        title="Add enrolled student"
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
              form="roster-add-student-form"
              disabled={saving || !programId || cloudDataDisabled}
              className="rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <form id="roster-add-student-form" className="space-y-3" onSubmit={submitStudent}>
          {saveError ? (
            <p className="text-sm text-red-600" role="alert">
              {saveError}
            </p>
          ) : null}
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-name">
              Full name
            </label>
            <input
              id="stu-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-grade">
              Grade (optional)
            </label>
            <input
              id="stu-grade"
              value={grade}
              onChange={(ev) => setGrade(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          {studentHasField("notes") ? (
            <div>
              <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-notes">
                Notes (optional)
              </label>
              <textarea
                id="stu-notes"
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              />
            </div>
          ) : null}
        </form>
      </AppModal>
    </div>
  );
}
