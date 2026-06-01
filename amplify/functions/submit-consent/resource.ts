import { defineFunction } from "@aws-amplify/backend";

export const submitConsent = defineFunction({
  name: "submit-consent",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "data",
});
