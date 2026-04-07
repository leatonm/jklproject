import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * Starter models for JKL platform data (programs, students).
 * Deploy with `npx ampx sandbox` then use `generateClient<Schema>()` in the app.
 */
const schema = a.schema({
  Program: a
    .model({
      name: a.string().required(),
      description: a.string(),
      students: a.hasMany("Student", "programId"),
    })
    .authorization((allow) => [allow.authenticated()]),

  Student: a
    .model({
      name: a.string().required(),
      grade: a.string(),
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
