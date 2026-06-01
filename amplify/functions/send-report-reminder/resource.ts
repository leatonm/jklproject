import { defineFunction, secret } from "@aws-amplify/backend";

export const sendReportReminder = defineFunction({
  name: "send-report-reminder",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "data",
  environment: {
    CONSENT_EMAIL_FROM: secret("CONSENT_EMAIL_FROM"),
  },
});
