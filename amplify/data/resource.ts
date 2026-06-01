import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { sendConsentEmail } from "../functions/send-consent-email/resource";
import { submitConsent } from "../functions/submit-consent/resource";
import { sendReportReminder } from "../functions/send-report-reminder/resource";

/**
 * JKL platform data — DynamoDB via AppSync.
 *
 * Custom mutations (Lambda):
 * - enrollStudentWithConsent — create student + SES waiver link
 * - submitGuardianConsent — public guardian sign
 * - sendReportReminder — admin email reminder for reports
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
      weeklyReports: a.hasMany("WeeklyReport", "programId"),
      reportReminders: a.hasMany("ReportReminder", "programId"),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  /** Enrolled student on a program roster (grades 9–12 in UI). */
  Student: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      name: a.string().required(),
      grade: a.string(),
      notes: a.string(),
      studentPhone: a.string(),
      parentName: a.string(),
      parentEmail: a.string(),
      parentPhone: a.string(),
      dateOfBirth: a.date(),
      /** pending | sent | signed | uploaded */
      consentStatus: a.string(),
      consentEmailSentAt: a.datetime(),
      consentDigitalSignedAt: a.datetime(),
      consentUploadKey: a.string(),
      /** SHA-256 of magic-link token (never store raw token). */
      consentTokenHash: a.string(),
      enrolledAt: a.datetime().required(),
      attendanceRecords: a.hasMany("AttendanceRecord", "studentId"),
    })
    .secondaryIndexes((index) => [
      index("programId").sortKeys(["enrolledAt"]),
      index("consentTokenHash"),
    ])
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

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
      canceled: a.boolean(),
      seriesId: a.string(),
      coverImageUrl: a.string(),
      coverImageKey: a.string(),
      /** Set when instructor completes roll call for all students. */
      attendanceCompletedAt: a.datetime(),
      attendancePresentCount: a.integer(),
      attendanceTotalCount: a.integer(),
      attendanceRecords: a.hasMany("AttendanceRecord", "classActivityId"),
    })
    .secondaryIndexes((index) => [index("programId").sortKeys(["startsAt"])])
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  AttendanceRecord: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      classActivityId: a.id().required(),
      classActivity: a.belongsTo("ClassActivity", "classActivityId"),
      studentId: a.id().required(),
      student: a.belongsTo("Student", "studentId"),
      status: a.string().required(),
    })
    .secondaryIndexes((index) => [index("classActivityId")])
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  Highlight: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      title: a.string().required(),
      detail: a.string(),
      kind: a.string(),
    })
    .secondaryIndexes((index) => [index("programId")])
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  ResourceLibraryLink: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      title: a.string().required(),
      subtitle: a.string(),
      url: a.string().required(),
      kind: a.string(),
      color: a.string(),
      thumbnailUrl: a.string(),
      thumbnailKey: a.string(),
      orderIndex: a.integer(),
    })
    .secondaryIndexes((index) => [index("programId").sortKeys(["orderIndex"])])
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  /** Instructor contact info (one row per signed-in owner). */
  InstructorProfile: a
    .model({
      displayName: a.string(),
      phone: a.string(),
      email: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read"]),
    ]),

  /** Weekly instructor report rollup for admin tracking. */
  WeeklyReport: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      /** ISO date YYYY-MM-DD (Monday of week). */
      weekStart: a.date().required(),
      /** draft | submitted | overdue */
      status: a.string().required(),
      submittedAt: a.datetime(),
      instructorNotes: a.string(),
      summaryThumbnailKey: a.string(),
      feedback: a.hasMany("ReportFeedback", "weeklyReportId"),
    })
    .secondaryIndexes((index) => [index("programId").sortKeys(["weekStart"])])
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  ReportFeedback: a
    .model({
      weeklyReportId: a.id().required(),
      weeklyReport: a.belongsTo("WeeklyReport", "weeklyReportId"),
      message: a.string().required(),
      authorRole: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  ReportReminder: a
    .model({
      programId: a.id().required(),
      program: a.belongsTo("Program", "programId"),
      weeklyReportId: a.id(),
      channel: a.string().required(),
      recipientEmail: a.string(),
      recipientPhone: a.string(),
      message: a.string().required(),
      sentAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.group("Admin").to(["read", "create", "update", "delete"]),
    ]),

  EnrollStudentResult: a.customType({
    studentId: a.string().required(),
    consentStatus: a.string().required(),
    emailSent: a.boolean().required(),
    message: a.string().required(),
  }),

  SubmitConsentResult: a.customType({
    ok: a.boolean().required(),
    message: a.string().required(),
  }),

  ReportReminderResult: a.customType({
    sent: a.boolean().required(),
    message: a.string().required(),
  }),

  enrollStudentWithConsent: a
    .mutation()
    .arguments({
      programId: a.id().required(),
      name: a.string().required(),
      grade: a.string().required(),
      parentName: a.string().required(),
      parentEmail: a.string().required(),
      parentPhone: a.string(),
      studentPhone: a.string(),
      dateOfBirth: a.date(),
      notes: a.string(),
    })
    .returns(a.ref("EnrollStudentResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(sendConsentEmail)),

  submitGuardianConsent: a
    .mutation()
    .arguments({
      token: a.string().required(),
      studentId: a.id().required(),
      signerName: a.string().required(),
    })
    .returns(a.ref("SubmitConsentResult"))
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(submitConsent)),

  sendReportReminder: a
    .mutation()
    .arguments({
      programId: a.id().required(),
      recipientEmail: a.string().required(),
      message: a.string().required(),
      weeklyReportId: a.id(),
    })
    .returns(a.ref("ReportReminderResult"))
    .authorization((allow) => [allow.group("Admin"), allow.authenticated()])
    .handler(a.handler.function(sendReportReminder)),
})
.authorization((allow) => [
  allow.resource(sendConsentEmail),
  allow.resource(submitConsent),
  allow.resource(sendReportReminder),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
