import { createHash, randomBytes } from "node:crypto";
import type { AppSyncResolverHandler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { Schema } from "../../data/resource";
import { env } from "$amplify/env/send-consent-email";

type Args = {
  programId: string;
  name: string;
  grade: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string | null;
  studentPhone?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
};

type Result = {
  studentId: string;
  consentStatus: string;
  emailSent: boolean;
  message: string;
};

const ses = new SESClient({});

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function buildSignUrl(baseUrl: string, rawToken: string, studentId: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ token: rawToken, studentId });
  return `${base}/sign?${params.toString()}`;
}

async function getDataClient() {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  return generateClient<Schema>();
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const args = event.arguments;
  const parentEmail = args.parentEmail?.trim();
  if (!parentEmail) {
    throw new Error("Parent / guardian email is required to send the waiver.");
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();

  const client = await getDataClient();
  const createRes = await client.models.Student.create({
    programId: args.programId,
    name: args.name.trim(),
    grade: args.grade.trim(),
    parentName: args.parentName.trim(),
    parentEmail,
    parentPhone: args.parentPhone?.trim() || undefined,
    studentPhone: args.studentPhone?.trim() || undefined,
    dateOfBirth: args.dateOfBirth?.trim() || undefined,
    notes: args.notes?.trim() || undefined,
    enrolledAt: now,
    consentTokenHash: tokenHash,
    consentStatus: "sent",
    consentEmailSentAt: now,
  });

  if (createRes.errors?.length || !createRes.data?.id) {
    throw new Error(createRes.errors?.map((e) => e.message).join(" ") ?? "Could not create student.");
  }

  const studentId = createRes.data.id;
  const from = process.env.CONSENT_EMAIL_FROM?.trim();
  const baseUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:5173";
  const signUrl = buildSignUrl(baseUrl, rawToken, studentId);
  const subject = `Action requested: Waiver for ${args.name.trim()} — Just Keep Livin`;
  const bodyText = [
    "Dear Legal Guardian,",
    "",
    `We are delighted to welcome ${args.name.trim()} to the Just Keep Livin Foundation after-school program.`,
    "",
    "Please review and sign the JKL Waiver, Liability, and Publicity Release Form using the link below:",
    signUrl,
    "",
    "Thank you for your cooperation.",
    "",
    "Warm regards,",
    "The Just Keep Livin Foundation Team",
  ].join("\n");

  let emailSent = false;
  let message = "Student enrolled. Consent email not sent (SES sender not configured).";

  if (from) {
    try {
      await ses.send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [parentEmail] },
          Message: {
            Subject: { Data: subject },
            Body: {
              Text: { Data: bodyText },
              Html: {
                Data: `<p>Dear Legal Guardian,</p><p>Please sign the waiver for <strong>${args.name.trim()}</strong>:</p><p><a href="${signUrl}">Sign waiver</a></p><p>Thank you,<br/>The Just Keep Livin Foundation Team</p>`,
              },
            },
          },
        }),
      );
      emailSent = true;
      message = "Student enrolled and consent email sent.";
    } catch (err) {
      console.error("SES send failed", err);
      message = `Student enrolled. Email failed: ${err instanceof Error ? err.message : "unknown"}`;
    }
  } else {
    console.info("CONSENT_EMAIL_FROM not set; dry-run email", { parentEmail, signUrl });
    message = "Student enrolled. Set CONSENT_EMAIL_FROM secret to send email (logged sign URL).";
  }

  return {
    studentId,
    consentStatus: "sent",
    emailSent,
    message,
  };
};
