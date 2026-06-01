import { DATA_PAGE_SIZE } from "@/data/constants";
import { amplifyDataClient } from "@/lib/amplifyDataClient";
import { studentHasField } from "@/lib/amplifyModelMeta";

export type StudentRow = {
  id: string;
  name: string;
  programId: string;
  grade?: string | null;
  notes?: string | null;
  studentPhone?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  dateOfBirth?: string | null;
  consentStatus?: string | null;
  consentEmailSentAt?: string | null;
  consentDigitalSignedAt?: string | null;
  consentUploadKey?: string | null;
  enrolledAt?: string | null;
  createdAt?: string | null;
};

export type ActivityRow = {
  id: string;
  title: string;
  startsAt: string;
  programId: string;
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  coverImageKey?: string | null;
  coverImageUrl?: string | null;
  canceled?: boolean | null;
  seriesId?: string | null;
  attendanceCompletedAt?: string | null;
  attendancePresentCount?: number | null;
  attendanceTotalCount?: number | null;
};

export type AttendanceRow = {
  id: string;
  programId: string;
  classActivityId: string;
  studentId: string;
  status: string;
};

export type HighlightRow = {
  id: string;
  title: string;
  programId: string;
  detail?: string | null;
  kind?: string | null;
};

export type WeeklyReportRow = {
  id: string;
  programId: string;
  weekStart: string;
  status: string;
  submittedAt?: string | null;
  instructorNotes?: string | null;
  summaryThumbnailKey?: string | null;
};

export type ReportFeedbackRow = {
  id: string;
  weeklyReportId: string;
  message: string;
  authorRole?: string | null;
  createdAt?: string | null;
};

export type InstructorProfileRow = {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ResourceLibraryRow = {
  id: string;
  programId: string;
  title: string;
  url: string;
  subtitle?: string | null;
  kind?: string | null;
  color?: string | null;
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  orderIndex?: number | null;
};

type ListErrors = { message: string }[];

type ListOutcome<T> = {
  data: T[];
  nextToken?: string;
  errors?: ListErrors;
};

function sortIsoDesc(a: string | undefined | null, b: string | undefined | null) {
  const sa = a ?? "";
  const sb = b ?? "";
  return sb.localeCompare(sa);
}

function callIfFn<T>(
  obj: Record<string, unknown>,
  key: string,
  args: unknown[],
): Promise<ListOutcome<T>> | null {
  const fn = obj[key];
  if (typeof fn !== "function") return null;
  return fn.apply(obj, args) as Promise<ListOutcome<T>>;
}

/** Student list: uses GSI query when the deployed API includes it; otherwise `list` + filter. */
export async function listStudentsForProgram(
  programId: string,
  options: { limit?: number; nextToken?: string } = {},
): Promise<ListOutcome<StudentRow>> {
  const limit = options.limit ?? DATA_PAGE_SIZE;
  const model = amplifyDataClient.models.Student as unknown as Record<
    string,
    unknown
  >;

  const indexed = await callIfFn<StudentRow>(model, "listStudentByProgramIdAndEnrolledAt", [
    { programId },
    { limit, nextToken: options.nextToken, sortDirection: "DESC" },
  ]);
  if (indexed) return indexed;

  const res = await amplifyDataClient.models.Student.list({
    filter: { programId: { eq: programId } },
    limit,
    nextToken: options.nextToken,
  });
  const data = [...((res.data ?? []) as StudentRow[])].sort((x, y) =>
    sortIsoDesc(x.enrolledAt ?? x.createdAt, y.enrolledAt ?? y.createdAt),
  );
  return { data, nextToken: res.nextToken ?? undefined, errors: res.errors };
}

export async function createStudentRecord(input: {
  programId: string;
  name: string;
  grade?: string;
  notes?: string;
  studentPhone?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  dateOfBirth?: string;
}) {
  const payload: Record<string, string> = {
    programId: input.programId,
    name: input.name,
  };
  if (studentHasField("grade") && input.grade?.trim()) payload.grade = input.grade.trim();
  if (studentHasField("notes") && input.notes?.trim()) payload.notes = input.notes.trim();
  if (studentHasField("studentPhone") && input.studentPhone?.trim())
    payload.studentPhone = input.studentPhone.trim();
  if (studentHasField("parentName") && input.parentName?.trim())
    payload.parentName = input.parentName.trim();
  if (studentHasField("parentEmail") && input.parentEmail?.trim())
    payload.parentEmail = input.parentEmail.trim();
  if (studentHasField("parentPhone") && input.parentPhone?.trim())
    payload.parentPhone = input.parentPhone.trim();
  if (studentHasField("dateOfBirth") && input.dateOfBirth?.trim())
    payload.dateOfBirth = input.dateOfBirth.trim();
  if (studentHasField("enrolledAt")) payload.enrolledAt = new Date().toISOString();
  if (studentHasField("consentStatus")) payload.consentStatus = "pending";

  return amplifyDataClient.models.Student.create(payload as never);
}

export type EnrollWithConsentResult = {
  studentId: string;
  consentStatus: string;
  emailSent: boolean;
  message: string;
};

/** Creates student and sends automated waiver email (requires deployed Lambda mutation). */
export async function enrollStudentWithConsent(input: {
  programId: string;
  name: string;
  grade: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  studentPhone?: string;
  dateOfBirth?: string;
  notes?: string;
}): Promise<{ data?: EnrollWithConsentResult; errors?: ListErrors }> {
  const mutations = (amplifyDataClient as unknown as { mutations?: Record<string, unknown> })
    .mutations;
  const fn = mutations?.enrollStudentWithConsent;
  if (typeof fn !== "function") {
    return {
      errors: [
        {
          message:
            "enrollStudentWithConsent is not deployed. Run npm run sandbox:once and refresh amplify_outputs.json.",
        },
      ],
    };
  }
  const res = (await (
    fn as (args: typeof input) => Promise<{ data?: EnrollWithConsentResult; errors?: ListErrors }>
  )(input)) as { data?: EnrollWithConsentResult; errors?: ListErrors };
  return res;
}

export async function submitGuardianConsent(input: {
  token: string;
  studentId: string;
  signerName: string;
}): Promise<{ data?: { ok: boolean; message: string }; errors?: ListErrors }> {
  const mutations = (amplifyDataClient as unknown as { mutations?: Record<string, unknown> })
    .mutations;
  const fn = mutations?.submitGuardianConsent;
  if (typeof fn !== "function") {
    return { errors: [{ message: "submitGuardianConsent is not deployed." }] };
  }
  return (
    fn as (
      args: typeof input,
      opts?: { authMode?: string },
    ) => Promise<{ data?: { ok: boolean; message: string }; errors?: ListErrors }>
  )(input, { authMode: "identityPool" });
}

export async function updateStudentRecord(input: {
  id: string;
  name?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  studentPhone?: string | null;
  dateOfBirth?: string | null;
  grade?: string | null;
  notes?: string | null;
  consentStatus?: string | null;
  consentDigitalSignedAt?: string | null;
  consentUploadKey?: string | null;
}) {
  const payload: Record<string, string | null> = { id: input.id };
  if (studentHasField("name") && input.name !== undefined)
    payload.name = input.name?.trim() || "";
  if (studentHasField("parentName") && input.parentName !== undefined)
    payload.parentName = input.parentName?.trim() || null;
  if (studentHasField("parentEmail") && input.parentEmail !== undefined)
    payload.parentEmail = input.parentEmail?.trim() || null;
  if (studentHasField("parentPhone") && input.parentPhone !== undefined)
    payload.parentPhone = input.parentPhone?.trim() || null;
  if (studentHasField("studentPhone") && input.studentPhone !== undefined)
    payload.studentPhone = input.studentPhone?.trim() || null;
  if (studentHasField("dateOfBirth") && input.dateOfBirth !== undefined)
    payload.dateOfBirth = input.dateOfBirth?.trim() || null;
  if (studentHasField("grade") && input.grade !== undefined)
    payload.grade = input.grade?.trim() || null;
  if (studentHasField("notes") && input.notes !== undefined)
    payload.notes = input.notes?.trim() || null;
  if (studentHasField("consentStatus") && input.consentStatus !== undefined)
    payload.consentStatus = input.consentStatus;
  if (studentHasField("consentDigitalSignedAt") && input.consentDigitalSignedAt !== undefined)
    payload.consentDigitalSignedAt = input.consentDigitalSignedAt;
  if (studentHasField("consentUploadKey") && input.consentUploadKey !== undefined)
    payload.consentUploadKey = input.consentUploadKey;
  return amplifyDataClient.models.Student.update(payload as never);
}

/**
 * Resolve the ClassActivity client at runtime. Do **not** gate on
 * `amplify_outputs.json` introspection — that file is often stale after a deploy,
 * which would hide all activities even when the API has data.
 */
function classActivityApi():
  | Record<string, unknown>
  | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>)
    .ClassActivity;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

/** True if the generated client exposes list/create for ClassActivity. */
export function hasRuntimeClassActivityClient(): boolean {
  const m = classActivityApi();
  return Boolean(m && typeof m.list === "function");
}

export async function listActivitiesForProgram(
  programId: string,
  options: { limit?: number; nextToken?: string } = {},
): Promise<ListOutcome<ActivityRow>> {
  const model = classActivityApi();
  if (!model || typeof model.list !== "function") {
    return { data: [], nextToken: undefined };
  }
  const limit = options.limit ?? DATA_PAGE_SIZE;

  /** Always use `list` + `programId` filter so rows show reliably. GSI client helpers can return empty if partition/sort args do not match the deployed API. */
  const res = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
      nextToken?: string;
    }) => Promise<ListOutcome<ActivityRow> & { data?: ActivityRow[] }>
  )({
    filter: { programId: { eq: programId } },
    limit,
    nextToken: options.nextToken,
  });
  const data = [...((res.data ?? []) as ActivityRow[])].sort((x, y) =>
    sortIsoDesc(x.startsAt, y.startsAt),
  );
  return { data, nextToken: res.nextToken ?? undefined, errors: res.errors };
}

/**
 * Upcoming activities for home carousel — loads a window of program activities and
 * filters client-side so we do not rely on compound GraphQL filters (which can differ by API version).
 */
export async function listUpcomingActivitiesForProgram(
  programId: string,
  limit = 12,
): Promise<ListOutcome<ActivityRow>> {
  const res = await listActivitiesForProgram(programId, { limit: 100 });
  if (res.errors?.length) return res;
  const now = Date.now();
  const data = (res.data ?? [])
    .filter((a) => new Date(a.startsAt).getTime() >= now)
    .sort((x, y) => (x.startsAt ?? "").localeCompare(y.startsAt ?? ""))
    .slice(0, limit);
  return { data, nextToken: undefined, errors: res.errors };
}

export async function createActivityRecord(
  input: Record<string, string | boolean | undefined>,
) {
  const api = classActivityApi();
  if (!api || typeof api.create !== "function") {
    return {
      data: undefined,
      errors: [{ message: "ClassActivity model is not deployed." }],
    };
  }
  const payload: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v === "") continue;
    payload[k] = v;
  }
  return (api.create as (p: Record<string, string | boolean>) => Promise<unknown>)(payload);
}

export async function updateClassActivityRecord(input: {
  id: string;
  canceled?: boolean;
  attendanceCompletedAt?: string | null;
  attendancePresentCount?: number | null;
  attendanceTotalCount?: number | null;
}) {
  const api = classActivityApi();
  if (!api || typeof api.update !== "function") {
    return {
      data: undefined,
      errors: [{ message: "ClassActivity model is not deployed." }],
    };
  }
  const payload: Record<string, string | number | boolean | null> = { id: input.id };
  if (typeof input.canceled === "boolean") payload.canceled = input.canceled;
  if (input.attendanceCompletedAt !== undefined)
    payload.attendanceCompletedAt = input.attendanceCompletedAt;
  if (input.attendancePresentCount !== undefined)
    payload.attendancePresentCount = input.attendancePresentCount;
  if (input.attendanceTotalCount !== undefined)
    payload.attendanceTotalCount = input.attendanceTotalCount;
  return (api.update as (p: Record<string, string | number | boolean | null>) => Promise<unknown>)(
    payload,
  );
}

/** Mark session roll call complete with present/total counts. */
export async function completeActivityRollCall(input: {
  activityId: string;
  presentCount: number;
  totalCount: number;
}) {
  return updateClassActivityRecord({
    id: input.activityId,
    attendanceCompletedAt: new Date().toISOString(),
    attendancePresentCount: input.presentCount,
    attendanceTotalCount: input.totalCount,
  });
}

export async function getClassActivityById(id: string) {
  const api = classActivityApi();
  if (!api || typeof api.get !== "function") {
    return { data: undefined as ActivityRow | undefined, errors: undefined };
  }
  return (api.get as (p: { id: string }) => Promise<{ data?: ActivityRow; errors?: ListErrors }>)({
    id,
  });
}

function attendanceRecordApi(): Record<string, unknown> | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>).AttendanceRecord;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

export function hasRuntimeAttendanceRecordClient(): boolean {
  const m = attendanceRecordApi();
  return Boolean(m && typeof m.list === "function");
}

export async function listAttendanceRecordsForActivity(classActivityId: string) {
  const api = attendanceRecordApi();
  if (!api || typeof api.list !== "function") {
    return { data: [] as AttendanceRow[], errors: undefined as ListErrors | undefined };
  }
  const res = await (
    api.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
    }) => Promise<{ data?: AttendanceRow[]; errors?: ListErrors }>
  )({
    filter: { classActivityId: { eq: classActivityId } },
    limit: 500,
  });
  return { data: (res.data ?? []) as AttendanceRow[], errors: res.errors };
}

export async function upsertAttendanceRecord(input: {
  programId: string;
  classActivityId: string;
  studentId: string;
  status: string;
}) {
  const api = attendanceRecordApi();
  if (!api || typeof api.list !== "function" || typeof api.create !== "function") {
    return {
      data: undefined,
      errors: [{ message: "AttendanceRecord model is not deployed." }],
    };
  }
  const existing = await (
    api.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
    }) => Promise<{ data?: { id: string; studentId?: string }[]; errors?: ListErrors }>
  )({
    filter: { classActivityId: { eq: input.classActivityId } },
    limit: 500,
  });
  if (existing.errors?.length) return { data: undefined, errors: existing.errors };
  const row = (existing.data ?? []).find((r) => r.studentId === input.studentId);
  if (row?.id) {
    return (api.update as (p: { id: string; status: string }) => Promise<unknown>)({
      id: row.id,
      status: input.status,
    });
  }
  return (api.create as (p: Record<string, string>) => Promise<unknown>)({
    programId: input.programId,
    classActivityId: input.classActivityId,
    studentId: input.studentId,
    status: input.status,
  });
}

function highlightApi(): Record<string, unknown> | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>)
    .Highlight;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

export function hasRuntimeHighlightClient(): boolean {
  const m = highlightApi();
  return Boolean(m && typeof m.list === "function");
}

export async function listHighlightsForProgram(
  programId: string,
  options: { limit?: number; nextToken?: string } = {},
): Promise<ListOutcome<HighlightRow>> {
  const model = highlightApi();
  if (!model || typeof model.list !== "function") {
    return { data: [], nextToken: undefined };
  }
  const limit = options.limit ?? DATA_PAGE_SIZE;

  const res = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
      nextToken?: string;
    }) => Promise<ListOutcome<HighlightRow> & { data?: HighlightRow[] }>
  )({
    filter: { programId: { eq: programId } },
    limit,
    nextToken: options.nextToken,
  });
  return {
    data: (res.data ?? []) as HighlightRow[],
    nextToken: res.nextToken ?? undefined,
    errors: res.errors,
  };
}

export async function createHighlightRecord(
  input: Record<string, string | undefined>,
) {
  const api = highlightApi();
  if (!api || typeof api.create !== "function") {
    return {
      data: undefined,
      errors: [{ message: "Highlight model is not deployed." }],
    };
  }
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== "") payload[k] = v;
  }
  return (api.create as (p: Record<string, string>) => Promise<unknown>)(payload);
}

function resourceLibraryLinkApi(): Record<string, unknown> | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>)
    .ResourceLibraryLink;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

export function hasRuntimeResourceLibraryLinkClient(): boolean {
  const m = resourceLibraryLinkApi();
  return Boolean(m && typeof m.list === "function");
}

/** Shown on Resource Library page when the generated client has no model (pre-deploy / stale outputs). */
export function resourceLibraryLinkDeployHint(): string | null {
  if (hasRuntimeResourceLibraryLinkClient()) return null;
  return "Deploy the latest `amplify/` backend and refresh `amplify_outputs.json` so Resource Library links sync to the cloud.";
}

export async function listResourceLibraryLinksForProgram(
  programId: string,
  options: { limit?: number; nextToken?: string } = {},
): Promise<ListOutcome<ResourceLibraryRow>> {
  const model = resourceLibraryLinkApi();
  if (!model || typeof model.list !== "function") {
    return { data: [], nextToken: undefined };
  }
  const limit = options.limit ?? DATA_PAGE_SIZE;

  const res = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
      nextToken?: string;
    }) => Promise<ListOutcome<ResourceLibraryRow> & { data?: ResourceLibraryRow[] }>
  )({
    filter: { programId: { eq: programId } },
    limit,
    nextToken: options.nextToken,
  });
  const data = [...((res.data ?? []) as ResourceLibraryRow[])].sort((x, y) => {
    const ox = x.orderIndex ?? 0;
    const oy = y.orderIndex ?? 0;
    if (ox !== oy) return ox - oy;
    return (x.title ?? "").localeCompare(y.title ?? "");
  });
  return { data, nextToken: res.nextToken ?? undefined, errors: res.errors };
}

export async function createResourceLibraryLinkRecord(input: {
  programId: string;
  title: string;
  url: string;
  subtitle?: string;
  kind?: string;
  color?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  orderIndex?: number;
}) {
  const api = resourceLibraryLinkApi();
  if (!api || typeof api.create !== "function") {
    return {
      data: undefined,
      errors: [{ message: "ResourceLibraryLink model is not deployed." }],
    };
  }
  const payload: Record<string, string | number> = {
    programId: input.programId,
    title: input.title.trim(),
    url: input.url.trim(),
  };
  if (input.subtitle?.trim()) payload.subtitle = input.subtitle.trim();
  if (input.kind?.trim()) payload.kind = input.kind.trim();
  if (input.color?.trim()) payload.color = input.color.trim();
  if (input.thumbnailUrl?.trim()) payload.thumbnailUrl = input.thumbnailUrl.trim();
  if (input.thumbnailKey?.trim()) payload.thumbnailKey = input.thumbnailKey.trim();
  if (input.orderIndex !== undefined && Number.isFinite(input.orderIndex)) {
    payload.orderIndex = input.orderIndex;
  }
  return (api.create as (p: Record<string, string | number>) => Promise<unknown>)(
    payload,
  );
}

type EnsureDefaultResourcesOutcome = { created: boolean; error?: string };

/**
 * Backfills "default" Resource Library links into DynamoDB so local and prod
 * read the same source of truth (instead of relying on `src/data/resourceLibrary.ts`).
 *
 * Safe to call repeatedly.
 */
export async function ensureDefaultResourceLibraryLinksForProgram(
  programId: string,
): Promise<EnsureDefaultResourcesOutcome> {
  const api = resourceLibraryLinkApi();
  if (!api || typeof api.list !== "function" || typeof api.create !== "function") {
    return { created: false };
  }

  try {
    const existing = await listResourceLibraryLinksForProgram(programId, { limit: 500 });
    if (existing.errors?.length) {
      return { created: false, error: existing.errors.map((e) => e.message).join(" ") };
    }

    const CONSENT_URL = "/consent-form";
    const already = (existing.data ?? []).some((r) => (r.url ?? "").trim() === CONSENT_URL);
    if (already) return { created: false };

    const minOrder = (existing.data ?? []).reduce<number | null>((m, r) => {
      const oi = r.orderIndex;
      if (oi === undefined || oi === null || !Number.isFinite(oi)) return m;
      if (m === null) return oi;
      return Math.min(m, oi);
    }, null);

    const orderIndex = minOrder === null ? 0 : minOrder - 1;

    const created = (await createResourceLibraryLinkRecord({
      programId,
      title: "Parent consent form (print / PDF)",
      subtitle: "In-app printable template · same as roster link",
      url: CONSENT_URL,
      kind: "article",
      color: "bg-emerald-200",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=640&h=360&fit=crop&q=80",
      orderIndex,
    })) as { errors?: { message: string }[] };

    if (created.errors?.length) {
      return { created: false, error: created.errors.map((e) => e.message).join(" ") };
    }

    return { created: true };
  } catch (e) {
    return { created: false, error: e instanceof Error ? e.message : "Failed to seed defaults." };
  }
}

export function missingBackendModelsMessage(): string | null {
  const missing: string[] = [];
  if (!hasRuntimeClassActivityClient()) {
    missing.push("ClassActivity (redeploy backend, then refresh amplify_outputs.json)");
  }
  if (!hasRuntimeHighlightClient()) {
    missing.push("Highlight");
  }
  if (missing.length === 0) return null;
  return `The app client has no API for: ${missing.join("; ")}. Deploy the latest \`amplify/\` backend and run \`npx ampx generate outputs\` (or download outputs from Amplify) so \`amplify_outputs.json\` matches production.`;
}

function weeklyReportApi(): Record<string, unknown> | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>).WeeklyReport;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

export function hasRuntimeWeeklyReportClient(): boolean {
  const m = weeklyReportApi();
  return Boolean(m && typeof m.list === "function");
}

export async function listWeeklyReportsForProgram(
  programId: string,
  options: { limit?: number } = {},
): Promise<ListOutcome<WeeklyReportRow>> {
  const model = weeklyReportApi();
  if (!model || typeof model.list !== "function") {
    return { data: [], nextToken: undefined };
  }
  const res = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
    }) => Promise<ListOutcome<WeeklyReportRow> & { data?: WeeklyReportRow[] }>
  )({
    filter: { programId: { eq: programId } },
    limit: options.limit ?? DATA_PAGE_SIZE,
  });
  const data = [...((res.data ?? []) as WeeklyReportRow[])].sort((a, b) =>
    (b.weekStart ?? "").localeCompare(a.weekStart ?? ""),
  );
  return { data, nextToken: res.nextToken ?? undefined, errors: res.errors };
}

export async function upsertWeeklyReport(input: {
  programId: string;
  weekStart: string;
  status: string;
  instructorNotes?: string;
  submittedAt?: string;
}) {
  const model = weeklyReportApi();
  if (!model || typeof model.list !== "function" || typeof model.create !== "function") {
    return { errors: [{ message: "WeeklyReport model is not deployed." }] };
  }
  const existing = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
    }) => Promise<{ data?: WeeklyReportRow[]; errors?: ListErrors }>
  )({
    filter: {
      programId: { eq: input.programId },
      weekStart: { eq: input.weekStart },
    },
    limit: 5,
  });
  if (existing.errors?.length) return { data: undefined, errors: existing.errors };
  const row = (existing.data ?? [])[0];
  const payload: Record<string, string> = {
    programId: input.programId,
    weekStart: input.weekStart,
    status: input.status,
  };
  if (input.instructorNotes?.trim()) payload.instructorNotes = input.instructorNotes.trim();
  if (input.submittedAt) payload.submittedAt = input.submittedAt;
  if (row?.id) {
    return (model.update as (p: Record<string, string>) => Promise<unknown>)({
      id: row.id,
      ...payload,
    });
  }
  return (model.create as (p: Record<string, string>) => Promise<unknown>)(payload);
}

function reportFeedbackApi(): Record<string, unknown> | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>).ReportFeedback;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

export function hasRuntimeReportFeedbackClient(): boolean {
  const m = reportFeedbackApi();
  return Boolean(m && typeof m.list === "function");
}

export async function listFeedbackForWeeklyReport(weeklyReportId: string) {
  const model = reportFeedbackApi();
  if (!model || typeof model.list !== "function") {
    return { data: [] as ReportFeedbackRow[], errors: undefined as ListErrors | undefined };
  }
  const res = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
    }) => Promise<{ data?: ReportFeedbackRow[]; errors?: ListErrors }>
  )({
    filter: { weeklyReportId: { eq: weeklyReportId } },
    limit: 100,
  });
  const data = [...((res.data ?? []) as ReportFeedbackRow[])].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  );
  return { data, errors: res.errors };
}

export async function createReportFeedback(input: {
  weeklyReportId: string;
  message: string;
  authorRole?: string;
}) {
  const model = reportFeedbackApi();
  if (!model || typeof model.create !== "function") {
    return { errors: [{ message: "ReportFeedback model is not deployed." }] };
  }
  return (model.create as (p: Record<string, string>) => Promise<unknown>)({
    weeklyReportId: input.weeklyReportId,
    message: input.message.trim(),
    authorRole: input.authorRole ?? "admin",
  });
}

function instructorProfileApi(): Record<string, unknown> | undefined {
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>).InstructorProfile;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
}

export function hasRuntimeInstructorProfileClient(): boolean {
  const m = instructorProfileApi();
  return Boolean(m && typeof m.list === "function");
}

export async function getInstructorProfile(): Promise<{
  data?: InstructorProfileRow;
  errors?: ListErrors;
}> {
  const model = instructorProfileApi();
  if (!model || typeof model.list !== "function") {
    return { data: undefined, errors: undefined };
  }
  const res = await (
    model.list as (args: { limit?: number }) => Promise<{
      data?: InstructorProfileRow[];
      errors?: ListErrors;
    }>
  )({ limit: 1 });
  return { data: res.data?.[0], errors: res.errors };
}

export async function saveInstructorProfile(input: {
  displayName?: string;
  phone?: string;
  email?: string;
}) {
  const model = instructorProfileApi();
  if (!model || typeof model.list !== "function" || typeof model.create !== "function") {
    return { errors: [{ message: "InstructorProfile model is not deployed." }] };
  }
  const existing = await getInstructorProfile();
  if (existing.errors?.length) return { errors: existing.errors };
  const payload: Record<string, string> = {};
  if (input.displayName !== undefined) payload.displayName = input.displayName.trim();
  if (input.phone !== undefined) payload.phone = input.phone.trim();
  if (input.email !== undefined) payload.email = input.email.trim();
  if (existing.data?.id) {
    return (model.update as (p: Record<string, string>) => Promise<unknown>)({
      id: existing.data.id,
      ...payload,
    });
  }
  return (model.create as (p: Record<string, string>) => Promise<unknown>)(payload);
}

export async function sendReportReminderEmail(input: {
  programId: string;
  recipientEmail: string;
  message: string;
  weeklyReportId?: string;
}): Promise<{ data?: { sent: boolean; message: string }; errors?: ListErrors }> {
  const mutations = (amplifyDataClient as unknown as { mutations?: Record<string, unknown> })
    .mutations;
  const fn = mutations?.sendReportReminder;
  if (typeof fn !== "function") {
    return {
      errors: [
        {
          message:
            "sendReportReminder is not deployed. Run npm run sandbox:once and refresh amplify_outputs.json.",
        },
      ],
    };
  }
  return (fn as (args: typeof input) => Promise<{ data?: { sent: boolean; message: string }; errors?: ListErrors }>)(
    input,
  );
}

/** Average attendance % across sessions with completed roll call. */
export function averageAttendancePercent(
  activities: Pick<ActivityRow, "attendancePresentCount" | "attendanceTotalCount" | "attendanceCompletedAt">[],
): number | null {
  const completed = activities.filter(
    (a) => a.attendanceCompletedAt && (a.attendanceTotalCount ?? 0) > 0,
  );
  if (completed.length === 0) return null;
  const sum = completed.reduce((acc, a) => {
    const t = a.attendanceTotalCount ?? 0;
    const p = a.attendancePresentCount ?? 0;
    return acc + (t > 0 ? p / t : 0);
  }, 0);
  return Math.round((sum / completed.length) * 100);
}
