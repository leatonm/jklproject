import { defineBackend } from "@aws-amplify/backend";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { sendConsentEmail } from "./functions/send-consent-email/resource";
import { submitConsent } from "./functions/submit-consent/resource";
import { sendReportReminder } from "./functions/send-report-reminder/resource";

/**
 * Amplify Gen 2 backend: auth, GraphQL data, S3 storage, and Lambda business logic.
 * @see amplify/BACKEND_ROADMAP.md for requirements mapping and expansion notes.
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  sendConsentEmail,
  submitConsent,
  sendReportReminder,
});

const sesSendActions = ["ses:SendEmail", "ses:SendRawEmail"];

for (const fn of [backend.sendConsentEmail, backend.sendReportReminder]) {
  fn.resources.lambda.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: sesSendActions,
      resources: ["*"],
    }),
  );
}

export default backend;
