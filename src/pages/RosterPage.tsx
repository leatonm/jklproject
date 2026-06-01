import { Pencil, Plus, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppModal } from "@/components/ui/AppModal";
import { DATA_PAGE_SIZE } from "@/data/constants";
import {
  createStudentRecord,
  enrollStudentWithConsent,
  listStudentsForProgram,
  updateStudentRecord,
  type StudentRow,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { consentBadgeClass, consentStatusLabel, consentUiStatus } from "@/lib/consentStatus";
import { formatMediumDate } from "@/lib/formatMediumDate";
import { hasStorageInOutputs, studentHasField } from "@/lib/amplifyModelMeta";
import { ageYearsFromIsoDate } from "@/lib/studentAge";
import { getStudentConsentFileUrl, uploadStudentConsentFile } from "@/lib/uploadStudentConsent";
import { cn } from "@/lib/cn";

/** JKL after-school program serves grades 9–12 only. */
const GRADE_OPTIONS = ["9", "10", "11", "12"] as const;

export function RosterPage() {
  const location = useLocation();
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
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [uploadBusyId, setUploadBusyId] = useState<string | null>(null);

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
    setToast(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSaveError(null);
  }

  function parentFieldsRequired(): boolean {
    if (!dateOfBirth.trim()) return true;
    const age = ageYearsFromIsoDate(dateOfBirth.trim());
    if (age === null) return true;
    return age < 18;
  }

  async function submitStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!programId || cloudDataDisabled) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError("Full name is required.");
      return;
    }
    if (!grade.trim()) {
      setSaveError("Grade is required.");
      return;
    }
    const needParent = parentFieldsRequired();
    if (needParent) {
      if (!parentName.trim()) {
        setSaveError("Parent / guardian name is required for students under 18 (or when date of birth is not set).");
        return;
      }
      if (!parentEmail.trim()) {
        setSaveError("Parent / guardian email is required for students under 18 (or when date of birth is not set).");
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    try {
      const trimmedEmail = parentEmail.trim();
      if (trimmedEmail && needParent) {
        const enrolled = await enrollStudentWithConsent({
          programId,
          name: trimmed,
          grade: grade.trim(),
          parentName: parentName.trim(),
          parentEmail: trimmedEmail,
          parentPhone: parentPhone.trim() || undefined,
          studentPhone: studentPhone.trim() || undefined,
          dateOfBirth: dateOfBirth.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        if (enrolled.errors?.length) {
          const fallback = await createStudentRecord({
            programId,
            name: trimmed,
            grade: grade.trim(),
            notes: notes.trim() || undefined,
            parentName: parentName.trim() || undefined,
            parentEmail: trimmedEmail,
            parentPhone: parentPhone.trim() || undefined,
            studentPhone: studentPhone.trim() || undefined,
            dateOfBirth: dateOfBirth.trim() || undefined,
          });
          if (fallback.errors?.length) {
            setSaveError(enrolled.errors.map((er) => er.message).join(" "));
            return;
          }
          setToast(
            "Student saved locally. Deploy backend and set SES secrets to auto-send waiver email.",
          );
        } else {
          setToast(enrolled.data?.message ?? "Student saved. Waiver email sent to guardian.");
        }
      } else {
        const created = await createStudentRecord({
          programId,
          name: trimmed,
          grade: grade.trim(),
          notes: notes.trim() || undefined,
          parentName: parentName.trim() || undefined,
          parentEmail: trimmedEmail || undefined,
          parentPhone: parentPhone.trim() || undefined,
          studentPhone: studentPhone.trim() || undefined,
          dateOfBirth: dateOfBirth.trim() || undefined,
        });
        if (created.errors?.length) {
          setSaveError(created.errors.map((er) => er.message).join(" "));
          return;
        }
        setToast("Student saved.");
      }
      setName("");
      setGrade("");
      setParentName("");
      setParentEmail("");
      setParentPhone("");
      setStudentPhone("");
      setDateOfBirth("");
      setNotes("");
      closeModal();
      await loadFirst();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save student.");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadConsent(student: StudentRow, file: File | null) {
    if (!file || !studentHasField("consentUploadKey") || !hasStorageInOutputs()) return;
    setUploadBusyId(student.id);
    try {
      const key = await uploadStudentConsentFile(student.id, file);
      const res = (await updateStudentRecord({
        id: student.id,
        consentUploadKey: key,
        consentStatus: "uploaded",
      })) as { errors?: { message: string }[] };
      if (res.errors?.length) {
        setListError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      await loadFirst();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadBusyId(null);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent || cloudDataDisabled) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = (await updateStudentRecord({
        id: editStudent.id,
        name: name.trim(),
        grade: grade.trim(),
        parentName: parentName.trim() || null,
        parentEmail: parentEmail.trim() || null,
        parentPhone: parentPhone.trim() || null,
        studentPhone: studentPhone.trim() || null,
        dateOfBirth: dateOfBirth.trim() || null,
        notes: notes.trim() || null,
      })) as { errors?: { message: string }[] };
      if (res.errors?.length) {
        setSaveError(res.errors.map((er) => er.message).join(" "));
        return;
      }
      setEditStudent(null);
      setToast("Student updated.");
      await loadFirst();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not update student.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(student: StudentRow) {
    setEditStudent(student);
    setName(student.name);
    setGrade(student.grade ?? "");
    setParentName(student.parentName ?? "");
    setParentEmail(student.parentEmail ?? "");
    setParentPhone(student.parentPhone ?? "");
    setStudentPhone(student.studentPhone ?? "");
    setDateOfBirth(student.dateOfBirth ?? "");
    setNotes(student.notes ?? "");
    setSaveError(null);
  }

  async function openUploadedFile(key: string) {
    try {
      const { url } = await getStudentConsentFileUrl(key);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not open file.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader
        title="Student Roster"
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
        {toast ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            {toast}{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          </p>
        ) : null}

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

        <p className="text-xs text-zinc-500">
          Printable consent:{" "}
          <Link to="/consent-form" className="font-semibold text-jkl-navy hover:underline">
            Open consent form
          </Link>
          . Same link is available from Resource Library defaults.
        </p>

        {students.map((s) => {
          const c = consentUiStatus(s);
          return (
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
                        Grade {s.grade}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        consentBadgeClass(c),
                      )}
                    >
                      {consentStatusLabel(c)}
                    </span>
                    {s.consentEmailSentAt ? (
                      <span className="text-xs text-zinc-500">
                        Email sent {formatMediumDate(s.consentEmailSentAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="inline-flex items-center gap-1 rounded-xl border border-jkl-border px-3 py-1.5 text-xs font-semibold text-jkl-navy hover:bg-zinc-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit
                </button>
              </div>
              {(s.parentName || s.parentEmail || s.parentPhone) ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {s.parentName ? <span className="font-medium">{s.parentName}</span> : null}
                  {s.parentEmail ? ` · ${s.parentEmail}` : null}
                  {s.parentPhone ? ` · ${s.parentPhone}` : null}
                </p>
              ) : null}
              {s.studentPhone ? (
                <p className="mt-1 text-xs text-zinc-500">Student phone: {s.studentPhone}</p>
              ) : null}
              {s.dateOfBirth ? (
                <p className="mt-1 text-xs text-zinc-500">DOB on file: {s.dateOfBirth}</p>
              ) : null}
              {s.notes ? <p className="mt-3 text-sm text-zinc-600">{s.notes}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                <Link
                  to="/consent-form"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-jkl-border bg-white px-3 py-2 text-xs font-semibold text-jkl-navy hover:bg-zinc-50"
                >
                  Download / print form
                </Link>
                {s.consentUploadKey ? (
                  <button
                    type="button"
                    onClick={() => void openUploadedFile(s.consentUploadKey as string)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    View uploaded scan
                  </button>
                ) : null}
                {studentHasField("consentUploadKey") && hasStorageInOutputs() && c !== "complete" ? (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-jkl-border px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    {uploadBusyId === s.id ? "Uploading…" : "Upload signed form"}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="sr-only"
                      disabled={uploadBusyId === s.id || cloudDataDisabled}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0] ?? null;
                        ev.target.value = "";
                        void onUploadConsent(s, f);
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </article>
          );
        })}

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
          <p className="text-xs text-zinc-500">
            Grades 9–12 only. Waiver email sends automatically when guardian email is provided
            (after backend deploy). Consent turns green when the parent signs or you upload a scan.
          </p>
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
              Grade
            </label>
            <select
              id="stu-grade"
              value={grade}
              onChange={(ev) => setGrade(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
            >
              <option value="">Select grade…</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-dob">
              Date of birth (optional — used for guardian rules)
            </label>
            <input
              id="stu-dob"
              type="date"
              value={dateOfBirth}
              onChange={(ev) => setDateOfBirth(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-parent-name">
              Parent / guardian name
              {parentFieldsRequired() ? (
                <span className="text-red-600"> *</span>
              ) : (
                <span className="font-normal text-zinc-400"> (optional for 18+)</span>
              )}
            </label>
            <input
              id="stu-parent-name"
              value={parentName}
              onChange={(ev) => setParentName(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-parent-email">
              Parent / guardian email
              {parentFieldsRequired() ? (
                <span className="text-red-600"> *</span>
              ) : (
                <span className="font-normal text-zinc-400"> (optional for 18+)</span>
              )}
            </label>
            <input
              id="stu-parent-email"
              type="email"
              value={parentEmail}
              onChange={(ev) => setParentEmail(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-phone">
              Student phone (optional)
            </label>
            <input
              id="stu-phone"
              type="tel"
              value={studentPhone}
              onChange={(ev) => setStudentPhone(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="stu-parent-phone">
              Parent / guardian phone (optional)
            </label>
            <input
              id="stu-parent-phone"
              type="tel"
              value={parentPhone}
              onChange={(ev) => setParentPhone(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="tel"
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

      <AppModal
        open={editStudent !== null}
        onClose={() => setEditStudent(null)}
        title="Edit student & guardian"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditStudent(null)}
              className="rounded-xl border border-jkl-border px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="roster-edit-student-form"
              disabled={saving || cloudDataDisabled}
              className="rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        }
      >
        <form id="roster-edit-student-form" className="space-y-3" onSubmit={saveEdit}>
          {saveError ? (
            <p className="text-sm text-red-600" role="alert">
              {saveError}
            </p>
          ) : null}
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="edit-stu-name">
              Full name
            </label>
            <input
              id="edit-stu-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="edit-stu-grade">
              Grade
            </label>
            <select
              id="edit-stu-grade"
              value={grade}
              onChange={(ev) => setGrade(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              required
            >
              <option value="">Select grade…</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="edit-parent-name">
              Parent / guardian name
            </label>
            <input
              id="edit-parent-name"
              value={parentName}
              onChange={(ev) => setParentName(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="edit-parent-email">
              Parent / guardian email
            </label>
            <input
              id="edit-parent-email"
              type="email"
              value={parentEmail}
              onChange={(ev) => setParentEmail(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="edit-parent-phone">
              Parent / guardian phone
            </label>
            <input
              id="edit-parent-phone"
              type="tel"
              value={parentPhone}
              onChange={(ev) => setParentPhone(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="edit-stu-phone">
              Student phone
            </label>
            <input
              id="edit-stu-phone"
              type="tel"
              value={studentPhone}
              onChange={(ev) => setStudentPhone(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
}
