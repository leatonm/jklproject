import { signUp } from "aws-amplify/auth";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoMark } from "@/components/LogoMark";
import { normalizeEmail } from "@/lib/authEmail";
import { cn } from "@/lib/cn";

export function RegisterPage() {
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    const normalized = normalizeEmail(email);
    try {
      await signUp({
        username: normalized,
        password,
        options: {
          userAttributes: { email: normalized },
        },
      });
      navigate("/confirm-signup", { state: { email: normalized } });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not create account.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-jkl-cream to-white px-4 py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center">
          <LogoMark size={72} className="rounded-2xl shadow-sm ring-1 ring-black/5" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-jkl-navy-muted">
            Instructor&apos;s app
          </p>
        </div>

        <div className="rounded-2xl border border-jkl-border bg-white p-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)]">
          <h1 className="text-center text-2xl font-bold text-jkl-ink">
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            We&apos;ll email you a confirmation code after you sign up.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
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
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-jkl-navy/80 px-3 py-3 text-jkl-ink outline-none focus:border-jkl-navy focus:ring-2 focus:ring-jkl-navy/20"
              />
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-jkl-navy/80 py-3 pl-3 pr-12 outline-none focus:border-jkl-navy focus:ring-2 focus:ring-jkl-navy/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
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

            <div className="space-y-1.5">
              <label
                htmlFor={confirmId}
                className="text-xs font-semibold uppercase tracking-wide text-jkl-navy-muted"
              >
                Confirm password
              </label>
              <input
                id={confirmId}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border-2 border-jkl-navy/80 px-3 py-3 outline-none focus:border-jkl-navy focus:ring-2 focus:ring-jkl-navy/20"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className={cn(
                "mt-2 w-full rounded-xl bg-jkl-navy py-3.5 text-sm font-semibold text-white",
                "shadow-md shadow-jkl-navy/20 hover:bg-jkl-navy-muted disabled:opacity-60",
              )}
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-jkl-navy underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
