# JKL Platform — Backend roadmap

Translated product requirements into an expandable Amplify Gen 2 architecture.  
**Status key:** ✅ implemented in repo · 🟡 schema/Lambda ready, UI partial · ⬜ planned next phase

---

## 1. Requirements translation

| Original note | Product meaning | Backend / UI |
|---------------|-----------------|--------------|
| **9–12 / not all ages** | High-school program only; grade picker is 9, 10, 11, 12 | ✅ UI `GRADE_OPTIONS`; schema keeps free-form string |
| **Exit / existing student & parent info** | One screen for student + guardian; ability to **view and edit** after enroll | ✅ Edit modal on roster; `updateStudentRecord` |
| **No manual “mark consent”** | Consent badge is **automatic** only | ✅ Removed staff mark button; status from email/sign/upload |
| **Upload signed doc → green** | Scanned permission slip sets `consentStatus = uploaded` | ✅ Upload → `consentUploadKey` + status |
| **Permission slip email → green** | Automated SES email; parent signs via link → green | ✅ `enrollStudentWithConsent` Lambda + `submitGuardianConsent` |
| **Check SMTP / emails firing** | Verify SES sends on enroll | ✅ Lambda logs + `consentEmailSentAt`; see [Email setup](#email-setup-ses) |
| **Phone numbers** | Optional phone for student, parent, instructor | ✅ `studentPhone`, `parentPhone`, `InstructorProfile.phone` |
| **Missed attendance → red** | Past session day with no completed attendance | ✅ `attendanceStatusForActivity()` + activity badges |
| **Admin: missed days / highlights** | Admin sees programs with overdue attendance | 🟡 `AdminDashboardPage` + group `Admin` read access |
| **Green = attendance done, show %** | e.g. 9/10 present after roll call | ✅ `attendancePresentCount` / `attendanceTotalCount` on save |
| **Admin: thumbnail summary** | Visual rollup on admin view | ⬜ `WeeklyReport.summaryThumbnailKey` — upload UI next |
| **Admin vs instructor login** | Separate Cognito groups | ✅ Groups `Admin`, `Instructor` |
| **Admin feedback / remind on reports** | Comment on reports; email/SMS reminder | ✅ `ReportFeedback`, `sendReportReminder` mutation |

---

## 2. Architecture

```
amplify/
├── auth/resource.ts          Cognito + groups (Admin, Instructor)
├── data/resource.ts          GraphQL schema + custom mutations
├── storage/resource.ts       S3 (consent uploads, report thumbnails)
├── backend.ts                Wires auth, data, storage, Lambdas, IAM (SES)
├── BACKEND_ROADMAP.md        This file
└── functions/
    ├── send-consent-email/   Enroll + SES waiver link
    ├── submit-consent/       Public guardian sign (token)
    └── send-report-reminder/ Admin email/SMS reminder
```

### Data flow — automated consent

```
Instructor saves student (parent email)
    → mutation enrollStudentWithConsent
    → Lambda: Student.create + token + SES email
    → Parent opens /sign/:token (public)
    → mutation submitGuardianConsent
    → Student.consentDigitalSignedAt + consentStatus = signed
    → Roster badge turns green (no staff action)
```

### Data flow — attendance indicators

```
ClassActivity (scheduled day)
    → Instructor marks present/absent for all students
    → upsertAttendanceRecord + completeActivityAttendance
    → ClassActivity.attendanceCompletedAt, presentCount, totalCount
    → Admin dashboard: green if complete, red if past due with no completion
```

---

## 3. Schema additions

### Student (extended)

| Field | Type | Purpose |
|-------|------|---------|
| `studentPhone` | string | Student contact |
| `parentPhone` | string | Guardian contact |
| `consentEmailSentAt` | datetime | When waiver email was sent |
| `consentStatus` | string | `pending` \| `sent` \| `signed` \| `uploaded` |
| `consentTokenHash` | string | SHA-256 of magic link token (not stored raw) |

### ClassActivity (extended)

| Field | Type | Purpose |
|-------|------|---------|
| `attendanceCompletedAt` | datetime | When full roll call finished |
| `attendancePresentCount` | integer | Present count at completion |
| `attendanceTotalCount` | integer | Roster size at completion |

### InstructorProfile

Phone and display name for signed-in instructor (`owner` auth).

### WeeklyReport

Per program + week: submission status for admin tracking.

### ReportFeedback

Admin comments on a weekly report.

---

## 4. Custom mutations (GraphQL)

| Mutation | Auth | Handler |
|----------|------|---------|
| `enrollStudentWithConsent` | Authenticated instructor | `send-consent-email` |
| `submitGuardianConsent` | Guest (public sign link) | `submit-consent` |
| `sendReportReminder` | Admin group | `send-report-reminder` |
| `completeActivityAttendance` | Authenticated | inline / future Lambda |

---

## 5. Email setup (SES)

1. **Verify domain or sender** in AWS SES (e.g. `programs@justkeeplivin.org`).
2. **Request production access** if sending outside sandbox.
3. Set Amplify secrets (sandbox):

   ```bash
   npx ampx sandbox secret set CONSENT_EMAIL_FROM programs@justkeeplivin.org
   npx ampx sandbox secret set APP_BASE_URL https://your-hosted-app.amplifyapp.com
   ```

4. Redeploy: `npm run sandbox:once`
5. **Test:** Add student with parent email → check CloudWatch logs for `send-consent-email` → confirm `consentEmailSentAt` on student row.

**Sandbox fallback:** If SES is not configured, Lambda still creates the student and logs the would-be email (dry-run) so you can verify the trigger.

---

## 6. Cognito groups

| Group | Purpose |
|-------|---------|
| `Instructor` | Default program owner; roster, attendance, reports |
| `Admin` | Read all owner data + send report reminders + admin dashboard |

Assign groups in **Cognito console → Users → Groups** or post-confirmation Lambda (future).

Dev bypass (`VITE_DEV_AUTH_BYPASS=true`) treats user as **Admin** for UI testing.

---

## 7. Expand next (without restructuring)

- [ ] Post-confirmation Lambda: auto-add new users to `Instructor`
- [ ] SMS via SNS for `sendReportReminder` when `channel = sms`
- [ ] Scheduled EventBridge rule: mark `WeeklyReport` overdue + auto-remind
- [ ] Report thumbnail capture (html-to-image → S3)
- [ ] Multi-program admin filters
- [ ] DocuSign external link as optional `CONSENT_SIGN_URL` env override

---

## 8. Deploy checklist

```bash
npm install
npm run sandbox:once          # local backend + amplify_outputs.json
npm run dev                   # frontend

# Production: push to GitHub → Amplify Hosting pipeline (amplify.yml)
# Set secrets in Amplify Console for each branch
```

After schema changes, always regenerate outputs before `npm run build`.
