import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { ActivitiesPage } from "@/pages/ActivitiesPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AttendancePage } from "@/pages/AttendancePage";
import { ConsentFormPage } from "@/pages/ConsentFormPage";
import { GuardianSignPage } from "@/pages/GuardianSignPage";
import { ConfirmSignUpPage } from "@/pages/ConfirmSignUpPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorProfilePage } from "@/pages/InstructorProfilePage";
import { LoginPage } from "@/pages/LoginPage";
import { QuickAddPage } from "@/pages/QuickAddPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { ResourceLibraryPage } from "@/pages/ResourceLibraryPage";
import { RosterPage } from "@/pages/RosterPage";
import { SearchPage } from "@/pages/SearchPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/sign" element={<GuardianSignPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="roster" element={<RosterPage />} />
          <Route path="consent-form" element={<ConsentFormPage />} />
          <Route path="attendance/:activityId" element={<AttendancePage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="profile" element={<InstructorProfilePage />} />
          <Route path="resources" element={<ResourceLibraryPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="quick-add" element={<QuickAddPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
