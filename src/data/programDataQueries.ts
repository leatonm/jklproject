import { DATA_PAGE_SIZE } from "@/data/constants";
import { amplifyDataClient } from "@/lib/amplifyDataClient";
import { studentHasField } from "@/lib/amplifyModelMeta";

export type StudentRow = {
  id: string;
  name: string;
  programId: string;
  grade?: string | null;
  notes?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  dateOfBirth?: string | null;
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
  parentName?: string;
  parentEmail?: string;
  dateOfBirth?: string;
}) {
  const payload: Record<string, string> = {
    programId: input.programId,
    name: input.name,
  };
  if (studentHasField("grade") && input.grade?.trim()) payload.grade = input.grade.trim();
  if (studentHasField("notes") && input.notes?.trim()) payload.notes = input.notes.trim();
  if (studentHasField("parentName") && input.parentName?.trim())
    payload.parentName = input.parentName.trim();
  if (studentHasField("parentEmail") && input.parentEmail?.trim())
    payload.parentEmail = input.parentEmail.trim();
  if (studentHasField("dateOfBirth") && input.dateOfBirth?.trim())
    payload.dateOfBirth = input.dateOfBirth.trim();
  if (studentHasField("enrolledAt")) payload.enrolledAt = new Date().toISOString();

  return amplifyDataClient.models.Student.create(payload as never);
}

export async function updateStudentRecord(input: {
  id: string;
  parentName?: string | null;
  parentEmail?: string | null;
  dateOfBirth?: string | null;
  grade?: string | null;
  notes?: string | null;
  consentDigitalSignedAt?: string | null;
  consentUploadKey?: string | null;
}) {
  const payload: Record<string, string | null> = { id: input.id };
  if (studentHasField("parentName") && input.parentName !== undefined)
    payload.parentName = input.parentName?.trim() || null;
  if (studentHasField("parentEmail") && input.parentEmail !== undefined)
    payload.parentEmail = input.parentEmail?.trim() || null;
  if (studentHasField("dateOfBirth") && input.dateOfBirth !== undefined)
    payload.dateOfBirth = input.dateOfBirth?.trim() || null;
  if (studentHasField("grade") && input.grade !== undefined)
    payload.grade = input.grade?.trim() || null;
  if (studentHasField("notes") && input.notes !== undefined)
    payload.notes = input.notes?.trim() || null;
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
}) {
  const api = classActivityApi();
  if (!api || typeof api.update !== "function") {
    return {
      data: undefined,
      errors: [{ message: "ClassActivity model is not deployed." }],
    };
  }
  const payload: { id: string; canceled?: boolean } = { id: input.id };
  if (typeof input.canceled === "boolean") payload.canceled = input.canceled;
  return (api.update as (p: typeof payload) => Promise<unknown>)(payload);
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
