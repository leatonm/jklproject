import { getCurrentUser } from "aws-amplify/auth";
import { getUrl } from "aws-amplify/storage";
import { uploadData } from "aws-amplify/storage";

export async function uploadStudentConsentFile(
  studentId: string,
  file: File,
): Promise<string> {
  const { userId } = await getCurrentUser();
  const rawExt = file.name.includes(".") ? (file.name.split(".").pop() ?? "pdf") : "pdf";
  const ext = rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "pdf";
  const path = `student-consent-uploads/${userId}/${studentId}/${crypto.randomUUID()}.${ext}`;
  await uploadData({
    path,
    data: file,
    options: { contentType: file.type || "application/pdf" },
  }).result;
  return path;
}

export async function getStudentConsentFileUrl(storageKey: string) {
  return getUrl({ path: storageKey });
}
