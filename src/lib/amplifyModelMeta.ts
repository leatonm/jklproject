import outputs from "../../amplify_outputs.json";

type IntrospectionModels = Record<string, { fields?: Record<string, unknown> }>;

function models(): IntrospectionModels {
  const m = (
    outputs as {
      data?: { model_introspection?: { models?: IntrospectionModels } };
    }
  ).data?.model_introspection?.models;
  return m && typeof m === "object" ? m : {};
}

/** Models present in the deployed API (from downloaded `amplify_outputs.json`). */
export function hasAmplifyModel(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(models(), name);
}

/** Field names on Student in the deployed schema. */
export function studentHasField(name: string): boolean {
  const fields = models().Student?.fields;
  if (!fields) {
    return [
      "grade",
      "notes",
      "studentPhone",
      "parentName",
      "parentEmail",
      "parentPhone",
      "dateOfBirth",
      "consentStatus",
      "consentEmailSentAt",
      "consentDigitalSignedAt",
      "consentUploadKey",
      "enrolledAt",
    ].includes(name);
  }
  return Object.prototype.hasOwnProperty.call(fields, name);
}

/** When `ClassActivity` is missing from downloaded outputs (stale file), allow known optional fields. */
export function classActivityHasField(name: string): boolean {
  const fields = models().ClassActivity?.fields;
  if (!fields) {
    return [
      "coverImageUrl",
      "coverImageKey",
      "location",
      "description",
      "notes",
      "endsAt",
      "canceled",
      "seriesId",
      "attendanceCompletedAt",
      "attendancePresentCount",
      "attendanceTotalCount",
    ].includes(name);
  }
  return Object.prototype.hasOwnProperty.call(fields, name);
}

/** True when `amplify_outputs.json` includes file storage (after storage resource is deployed). */
export function hasStorageInOutputs(): boolean {
  return Object.prototype.hasOwnProperty.call(outputs, "storage");
}

/** Optional fields on ResourceLibraryLink when introspection is stale. */
export function resourceLibraryLinkHasField(name: string): boolean {
  const fields = models().ResourceLibraryLink?.fields;
  if (!fields) {
    return ["thumbnailUrl", "thumbnailKey", "subtitle", "kind", "color", "orderIndex"].includes(
      name,
    );
  }
  return Object.prototype.hasOwnProperty.call(fields, name);
}
