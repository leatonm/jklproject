import { defineStorage } from "@aws-amplify/backend";

/** Activity cover images — keys like `activity-covers/{identityId}/...`. */
export const storage = defineStorage({
  name: "jklActivityMedia",
  access: (allow) => ({
    "activity-covers/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "student-consent-uploads/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});
