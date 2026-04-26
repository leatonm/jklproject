import type { StudentRow } from "@/data/programDataQueries";

export type ConsentUiStatus = "complete" | "in_progress" | "incomplete";

/** Complete when there is a digital signature timestamp or a scanned upload on file. */
export function consentUiStatus(row: Pick<StudentRow, "consentDigitalSignedAt" | "consentUploadKey" | "parentEmail">): ConsentUiStatus {
  const digital = Boolean(row.consentDigitalSignedAt);
  const scan = Boolean(row.consentUploadKey?.trim());
  if (digital || scan) return "complete";
  if (row.parentEmail?.trim()) return "in_progress";
  return "incomplete";
}

export function consentStatusLabel(s: ConsentUiStatus): string {
  switch (s) {
    case "complete":
      return "Consent complete";
    case "in_progress":
      return "Consent in progress";
    default:
      return "Consent incomplete";
  }
}
