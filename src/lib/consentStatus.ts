import type { StudentRow } from "@/data/programDataQueries";

export type ConsentUiStatus = "complete" | "in_progress" | "incomplete";

/** Complete when signed online, uploaded scan, or consentStatus is signed/uploaded. */
export function consentUiStatus(
  row: Pick<
    StudentRow,
    "consentDigitalSignedAt" | "consentUploadKey" | "parentEmail" | "consentStatus"
  >,
): ConsentUiStatus {
  const status = row.consentStatus?.trim();
  if (status === "signed" || status === "uploaded") return "complete";
  const digital = Boolean(row.consentDigitalSignedAt);
  const scan = Boolean(row.consentUploadKey?.trim());
  if (digital || scan) return "complete";
  if (status === "sent" || row.parentEmail?.trim()) return "in_progress";
  return "incomplete";
}

export function consentStatusLabel(s: ConsentUiStatus): string {
  switch (s) {
    case "complete":
      return "Consent complete";
    case "in_progress":
      return "Awaiting signature";
    default:
      return "Consent incomplete";
  }
}

export function consentBadgeClass(s: ConsentUiStatus): string {
  switch (s) {
    case "complete":
      return "bg-emerald-100 text-emerald-900";
    case "in_progress":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-200 text-zinc-800";
  }
}
