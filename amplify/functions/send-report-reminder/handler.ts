import type { AppSyncResolverHandler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { Schema } from "../../data/resource";
import { env } from "$amplify/env/send-report-reminder";

type Args = {
  programId: string;
  recipientEmail: string;
  message: string;
  weeklyReportId?: string | null;
};

type Result = {
  sent: boolean;
  message: string;
};

const ses = new SESClient({});

async function getDataClient() {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  return generateClient<Schema>();
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { programId, recipientEmail, message, weeklyReportId } = event.arguments;
  const email = recipientEmail?.trim();
  if (!email) {
    return { sent: false, message: "Recipient email is required." };
  }

  const from = process.env.CONSENT_EMAIL_FROM?.trim();
  const client = await getDataClient();
  const now = new Date().toISOString();

  await client.models.ReportReminder.create({
    programId,
    weeklyReportId: weeklyReportId ?? undefined,
    channel: "email",
    recipientEmail: email,
    message: message.trim(),
    sentAt: now,
  });

  if (!from) {
    console.info("Report reminder dry-run", { email, message });
    return { sent: false, message: "Reminder logged. Set CONSENT_EMAIL_FROM to send email." };
  }

  try {
    await ses.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "JKL Platform — Report reminder" },
          Body: { Text: { Data: message.trim() } },
        },
      }),
    );
    return { sent: true, message: "Reminder email sent." };
  } catch (err) {
    console.error("Report reminder SES failed", err);
    return {
      sent: false,
      message: err instanceof Error ? err.message : "Failed to send reminder.",
    };
  }
};
