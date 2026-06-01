import { signIn } from "aws-amplify/auth";
import { Eye, EyeOff, UserRound } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { LogoMark } from "@/components/LogoMark";
import {
  getRememberedEmail,
  normalizeEmail,
  setRememberedEmail,
} from "@/lib/authEmail";
import { DEV_TEST_PASSWORD, DEV_TEST_USERNAME, isDevTestCredentials } from "@/lib/devAuth";
import { fetchUserRoles, isAdmin } from "@/lib/userRoles";
import { cn } from "@/lib/cn";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signInDevMock } = useAuth();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!getRememberedEmail());
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginAs, setLoginAs] = useState<"instructor" | "admin">("instructor");

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, from, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const normalized = normalizeEmail(email);
    try {
      if (isDevTestCredentials(normalized, password)) {
        signInDevMock();
        if (remember) setRememberedEmail(DEV_TEST_USERNAME);
        else setRememberedEmail("");
        navigate(loginAs === "admin" ? "/admin" : from, { replace: true });
        return;
      }

      const res = await signIn({ username: normalized, password });
      if (res.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        navigate("/confirm-signup", {
          replace: true,
          state: { email: normalized },
        });
        return;
      }
      if (remember) setRememberedEmail(normalized);
      else setRememberedEmail("");
      const roles = await fetchUserRoles();
      const destination =
        loginAs === "admin" && isAdmin(roles) ? "/admin" : from === "/admin" ? "/" : from;
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Sign-in failed. Try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-jkl-cream to-white px-4 py-10">
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center">
        <div className="mb-10 flex flex-col items-center">
          <LogoMark size={88} className="rounded-2xl shadow-sm ring-1 ring-black/5" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-jkl-navy-muted">
            Instructor&apos;s app
          </p>
        </div>

        <div className="w-full rounded-2xl border border-jkl-border bg-white p-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)]">
          <h1 className="text-center text-2xl font-bold tracking-tight text-jkl-ink">
            Log in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Use the email and password for your JKL program access.
          </p>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Sign in as an instructor or administrator. Your role is set in Cognito groups.
          </p>

          <div className="mt-6 flex rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setLoginAs("instructor")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                loginAs === "instructor"
                  ? "bg-white text-jkl-navy shadow-sm"
                  : "text-zinc-600 hover:text-jkl-ink",
              )}
            >
              Instructor
            </button>
            <button
              type="button"
              onClick={() => setLoginAs("admin")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                loginAs === "admin"
                  ? "bg-white text-jkl-navy shadow-sm"
                  : "text-zinc-600 hover:text-jkl-ink",
              )}
            >
              Admin
            </button>
          </div>

          {import.meta.env.DEV ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 ring-1 ring-amber-200/80">
              <strong>Local dev:</strong> email <code className="font-mono">{DEV_TEST_USERNAME}</code>{" "}
              / password <code className="font-mono">{DEV_TEST_PASSWORD}</code> skips Cognito. Or set{" "}
              <code className="font-mono">VITE_DEV_AUTH_BYPASS=true</code> in{" "}
              <code className="font-mono">.env.development</code> to skip this screen.
            </p>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label
                htmlFor={emailId}
                className="text-xs font-semibold uppercase tracking-wide text-jkl-navy-muted"
              >
                Email address
              </label>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-jkl-blue"
                  aria-hidden
                />
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-jkl-navy/80 bg-white py-3 pl-11 pr-3 text-jkl-ink outline-none transition placeholder:text-zinc-400 focus:border-jkl-navy focus:ring-2 focus:ring-jkl-navy/20"
                  placeholder="you@school.org"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={passwordId}
                className="text-xs font-semibold uppercase tracking-wide text-jkl-navy-muted"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-jkl-navy/80 bg-white py-3 pl-3 pr-12 text-jkl-ink outline-none transition placeholder:text-zinc-400 focus:border-jkl-navy focus:ring-2 focus:ring-jkl-navy/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-jkl-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className={cn(
                  "h-4 w-4 rounded border-jkl-border text-jkl-navy",
                  "focus:ring-2 focus:ring-jkl-navy/30",
                )}
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-jkl-navy py-3.5 text-sm font-semibold text-white shadow-md shadow-jkl-navy/20 transition hover:bg-jkl-navy-muted disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p>
              <Link
                to="/forgot-password"
                className="font-medium text-jkl-navy underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
            <p className="text-zinc-600">
              Don&apos;t have a password yet?{" "}
              <Link
                to="/register"
                className="font-semibold text-jkl-blue underline-offset-4 hover:underline"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
