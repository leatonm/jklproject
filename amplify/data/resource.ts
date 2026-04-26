import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * JKL platform data — DynamoDB via AppSync.
 *
 * - **Owner auth**: each signed-in user sees only their programs and related rows.
 * - **GSIs**: list by `programId` (+ sort key) so roster/activities scale without table scans.
 *
 * Deploy: `npm run sandbox` or Amplify Hosting pipeline (`npx ampx pipeline-deploy`).
 */
const schema = a.schema({
  Program: a
    .model({
      name: a.string().required(),
      description: a.string(),
      students: a.hasMany("Student", "programId"),
      classActivities: a.hasMany("ClassActivity", "programId"),
      highlights: a.hasMany("Highlight", "programId"),
      resourceLibraryLinks: a.hasMany("ResourceLibraryLink", "programId"),
      attendanceRecords: a.hasMany("AttendanceRecord", "programId"),
    })
    .authorization((allow) => [allow.owner()]),

  /** Enrolled student on a program roster (SOW: roster management). */
  Student: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      name: a.string().required(),
      grade: a.string(),
      notes: a.string(),
      parentName: a.string(),
      parentEmail: a.string(),
      /** ISO `YYYY-MM-DD` for age-based guardian rules in the app. */
      dateOfBirth: a.date(),
      /** Set when guardian completes digital consent (or marked by staff). */
      consentDigitalSignedAt: a.datetime(),
      /** S3 key for uploaded scanned consent (see `student-consent-uploads/*` storage). */
      consentUploadKey: a.string(),
      enrolledAt: a.datetime().required(),
      attendanceRecords: a.hasMany("AttendanceRecord", "studentId"),
    })
    .secondaryIndexes((index) => [
      index("programId").sortKeys(["enrolledAt"]),
    ])
    .authorization((allow) => [allow.owner()]),

  /** Scheduled class activity / event (SOW: attendance & scheduling). */
  ClassActivity: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      title: a.string().required(),
      startsAt: a.datetime().required(),
      endsAt: a.datetime(),
      location: a.string(),
      description: a.string(),
      notes: a.string(),
      /** When true, session was canceled but kept on the calendar for history. */
      canceled: a.boolean(),
      /** Optional id shared by rows created from one recurring bulk action. */
      seriesId: a.string(),
      /** Public HTTPS image (e.g. CDN). */
      coverImageUrl: a.string(),
      /** S3 object key under the app storage bucket (see `amplify/storage/resource.ts`). */
      coverImageKey: a.string(),
      attendanceRecords: a.hasMany("AttendanceRecord", "classActivityId"),
    })
    .secondaryIndexes((index) => [
      index("programId").sortKeys(["startsAt"]),
    ])
    .authorization((allow) => [allow.owner()]),

  /** Per-student mark for one class session (links roster to scheduled activities). */
  AttendanceRecord: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      classActivityId: a.id().required(),
      classActivity: a.belongsTo("ClassActivity", "classActivityId"),
      studentId: a.id().required(),
      student: a.belongsTo("Student", "studentId"),
      /** `present` | `absent` | `unmarked` */
      status: a.string().required(),
    })
    .secondaryIndexes((index) => [index("classActivityId")])
    .authorization((allow) => [allow.owner()]),

  /** Instructor-captured highlight for reports (SOW: reporting & engagement). */
  Highlight: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      title: a.string().required(),
      detail: a.string(),
      /** e.g. win | needs_attention | note — keep string for flexible reporting buckets. */
      kind: a.string(),
    })
    .secondaryIndexes((index) => [index("programId")])
    .authorization((allow) => [allow.owner()]),

  /** Curated external links for the home Resource Library carousel (per program). */
  ResourceLibraryLink: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      title: a.string().required(),
      subtitle: a.string(),
      url: a.string().required(),
      /** "article" | "video" — string for simple filtering/display. */
      kind: a.string(),
      /** Tailwind bg class for card stripe, e.g. bg-violet-200 */
      color: a.string(),
      /** HTTPS image for card thumbnail (article or video poster). */
      thumbnailUrl: a.string(),
      /** S3 object key for uploaded thumbnail (see `amplify/storage/resource.ts`). */
      thumbnailKey: a.string(),
      /** Sort order within the program (lower first). */
      orderIndex: a.integer(),
    })
    .secondaryIndexes((index) => [
      index("programId").sortKeys(["orderIndex"]),
    ])
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
