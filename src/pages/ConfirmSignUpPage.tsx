import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { useId, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogoMark } from "@/components/LogoMark";

export function ConfirmSignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const codeId = useId();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      navigate("/register", { replace: true });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code.trim() });
      navigate("/login", { replace: true, state: { confirmed: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!email) return;
    setError(null);
    setResent(false);
    try {
      await resendSignUpCode({ username: email });
      setResent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-jkl-cream px-4">
        <p className="text-sm text-zinc-600">
          Start from{" "}
          <Link to="/register" className="font-semibold text-jkl-navy underline">
            registration
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-jkl-cream to-white px-4 py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <LogoMark size={64} className="rounded-2xl shadow-sm ring-1 ring-black/5" />
        </div>
        <div className="rounded-2xl border border-jkl-border bg-white p-8 shadow-lg">
          <h1 className="text-center text-xl font-bold text-jkl-ink">
            Confirm your email
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Enter the code we sent to <span className="font-medium">{email}</span>
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-800">
                {error}
              </p>
            ) : null}
            {resent ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-800">
                A new code was sent.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor={codeId} className="text-xs font-semibold uppercase text-jkl-navy-muted">
                Verification code
              </label>
              <input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border-2 border-jkl-navy/80 px-3 py-3 text-center text-lg tracking-widest outline-none focus:border-jkl-navy"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-jkl-navy py-3.5 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify and continue"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              onClick={() => void onResend()}
              className="font-medium text-jkl-navy underline-offset-4 hover:underline"
            >
              Resend code
            </button>
            <Link to="/login" className="text-zinc-500 hover:text-jkl-ink">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
