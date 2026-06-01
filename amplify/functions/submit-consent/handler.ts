import { createHash } from "node:crypto";
import type { AppSyncResolverHandler } from "aws-lambda";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { Schema } from "../../data/resource";
import { env } from "$amplify/env/submit-consent";

type Args = {
  token: string;
  studentId: string;
  signerName: string;
};

type Result = {
  ok: boolean;
  message: string;
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function getDataClient() {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  return generateClient<Schema>();
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { token, studentId, signerName } = event.arguments;
  if (!token?.trim() || !studentId?.trim() || !signerName?.trim()) {
    return { ok: false, message: "Token, student id, and signer name are required." };
  }

  const tokenHash = hashToken(token.trim());
  const client = await getDataClient();

  const studentRes = await client.models.Student.get({ id: studentId });
  const student = studentRes.data;
  if (!student) {
    return { ok: false, message: "Student not found." };
  }
  if (student.consentTokenHash !== tokenHash) {
    return { ok: false, message: "Invalid or expired consent link." };
  }
  if (student.consentStatus === "signed" || student.consentDigitalSignedAt) {
    return { ok: true, message: "Consent was already recorded." };
  }

  const now = new Date().toISOString();
  const updateRes = await client.models.Student.update({
    id: studentId,
    consentDigitalSignedAt: now,
    consentStatus: "signed",
    parentName: signerName.trim(),
  });

  if (updateRes.errors?.length) {
    return { ok: false, message: updateRes.errors.map((e) => e.message).join(" ") };
  }

  return { ok: true, message: "Thank you. Consent recorded successfully." };
};
