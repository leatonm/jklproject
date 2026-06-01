import { defineAuth } from "@aws-amplify/backend";

/**
 * Cognito email login with role groups.
 * - Instructor: default roster/attendance/reports owner
 * - Admin: cross-program read + report reminders (see data auth rules)
 *
 * Assign users to groups in Cognito console or a post-confirmation trigger.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ["Admin", "Instructor"],
});
