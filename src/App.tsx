import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { ActivitiesPage } from "@/pages/ActivitiesPage";
import { ConfirmSignUpPage } from "@/pages/ConfirmSignUpPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { QuickAddPage } from "@/pages/QuickAddPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { RosterPage } from "@/pages/RosterPage";
import { SearchPage } from "@/pages/SearchPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="roster" element={<RosterPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="quick-add" element={<QuickAddPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
