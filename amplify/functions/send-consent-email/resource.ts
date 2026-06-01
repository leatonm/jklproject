import { defineFunction, secret } from "@aws-amplify/backend";

export const sendConsentEmail = defineFunction({
  name: "send-consent-email",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "data",
  environment: {
    CONSENT_EMAIL_FROM: secret("CONSENT_EMAIL_FROM"),
    APP_BASE_URL: secret("APP_BASE_URL"),
  },
});
