import { getCurrentUser } from "aws-amplify/auth";
import { uploadData } from "aws-amplify/storage";

export async function uploadActivityCoverFile(file: File): Promise<string> {
  const { userId } = await getCurrentUser();
  const rawExt = file.name.includes(".")
    ? (file.name.split(".").pop() ?? "jpg")
    : "jpg";
  const ext = rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "jpg";
  const path = `activity-covers/${userId}/${crypto.randomUUID()}.${ext}`;
  await uploadData({
    path,
    data: file,
    options: { contentType: file.type || "image/jpeg" },
  }).result;
  return path;
}
