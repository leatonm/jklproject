import { DATA_PAGE_SIZE } from "@/data/constants";
import { amplifyDataClient } from "@/lib/amplifyDataClient";
import { hasAmplifyModel, studentHasField } from "@/lib/amplifyModelMeta";

export type StudentRow = {
  id: string;
  name: string;
  programId: string;
  grade?: string | null;
  notes?: string | null;
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
};

export type HighlightRow = {
  id: string;
  title: string;
  programId: string;
  detail?: string | null;
  kind?: string | null;
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
}) {
  const payload: Record<string, string> = {
    programId: input.programId,
    name: input.name,
  };
  if (studentHasField("grade") && input.grade?.trim())
    payload.grade = input.grade.trim();
  if (studentHasField("notes") && input.notes?.trim())
    payload.notes = input.notes.trim();
  if (studentHasField("enrolledAt"))
    payload.enrolledAt = new Date().toISOString();

  return amplifyDataClient.models.Student.create(payload as never);
}

function classActivityApi():
  | Record<string, unknown>
  | undefined {
  if (!hasAmplifyModel("ClassActivity")) return undefined;
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>)
    .ClassActivity;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
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

  const indexed = await callIfFn<ActivityRow>(
    model,
    "listClassActivityByProgramIdAndStartsAt",
    [
      { programId },
      { limit, nextToken: options.nextToken, sortDirection: "DESC" },
    ],
  );
  if (indexed) return indexed;

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

/** Upcoming activities: prefers indexed query with `startsAt >= now` when available. */
export async function listUpcomingActivitiesForProgram(
  programId: string,
  limit = 12,
): Promise<ListOutcome<ActivityRow>> {
  const model = classActivityApi();
  if (!model || typeof model.list !== "function") {
    return { data: [], nextToken: undefined };
  }
  const nowIso = new Date().toISOString();

  const indexed = await callIfFn<ActivityRow>(
    model,
    "listClassActivityByProgramIdAndStartsAt",
    [{ programId, startsAt: { ge: nowIso } }, { limit, sortDirection: "ASC" }],
  );
  if (indexed) return indexed;

  const res = await (
    model.list as (args: {
      filter?: Record<string, unknown>;
      limit?: number;
    }) => Promise<ListOutcome<ActivityRow> & { data?: ActivityRow[] }>
  )({
    filter: {
      programId: { eq: programId },
      startsAt: { ge: nowIso },
    },
    limit,
  });
  const data = [...((res.data ?? []) as ActivityRow[])].sort((x, y) =>
    (x.startsAt ?? "").localeCompare(y.startsAt ?? ""),
  );
  return { data, nextToken: res.nextToken ?? undefined, errors: res.errors };
}

export async function createActivityRecord(
  input: Record<string, string | undefined>,
) {
  const api = classActivityApi();
  if (!api || typeof api.create !== "function") {
    return {
      data: undefined,
      errors: [{ message: "ClassActivity model is not deployed." }],
    };
  }
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== "") payload[k] = v;
  }
  return (api.create as (p: Record<string, string>) => Promise<unknown>)(payload);
}

function highlightApi(): Record<string, unknown> | undefined {
  if (!hasAmplifyModel("Highlight")) return undefined;
  const m = (amplifyDataClient.models as unknown as Record<string, unknown>)
    .Highlight;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : undefined;
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

  const indexed = await callIfFn<HighlightRow>(model, "listHighlightByProgramId", [
    { programId },
    { limit, nextToken: options.nextToken },
  ]);
  if (indexed) return indexed;

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

export function missingBackendModelsMessage(): string | null {
  const missing: string[] = [];
  if (!hasAmplifyModel("ClassActivity")) {
    missing.push("ClassActivity (activities + home carousel)");
  }
  if (!hasAmplifyModel("Highlight")) {
    missing.push("Highlight (reports)");
  }
  if (missing.length === 0) return null;
  return `Your deployed API does not include yet: ${missing.join("; ")}. Push the latest \`amplify/\` backend from this repo and redeploy (Amplify Hosting build or \`npm run sandbox:once\`), then download a fresh \`amplify_outputs.json\`.`;
}
