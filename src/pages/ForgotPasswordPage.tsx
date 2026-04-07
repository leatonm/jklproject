import { confirmResetPassword, resetPassword } from "aws-amplify/auth";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "@/components/LogoMark";
import { normalizeEmail } from "@/lib/authEmail";

type Step = "request" | "confirm";

export function ForgotPasswordPage() {
  const emailId = useId();
  const codeId = useId();
  const passId = useId();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword({ username: normalizeEmail(email) });
      setStep("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await confirmResetPassword({
        username: normalizeEmail(email),
        confirmationCode: code.trim(),
        newPassword: password,
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-jkl-cream to-white px-4 py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <LogoMark size={64} className="rounded-2xl shadow-sm ring-1 ring-black/5" />
        </div>

        <div className="rounded-2xl border border-jkl-border bg-white p-8 shadow-lg">
          <h1 className="text-center text-xl font-bold text-jkl-ink">
            {done ? "Password updated" : "Reset password"}
          </h1>

          {done ? (
            <p className="mt-4 text-center text-sm text-zinc-600">
              You can now{" "}
              <Link to="/login" className="font-semibold text-jkl-navy underline">
                sign in
              </Link>{" "}
              with your new password.
            </p>
          ) : step === "request" ? (
            <form className="mt-8 space-y-4" onSubmit={onRequest}>
              <p className="text-center text-sm text-zinc-500">
                We&apos;ll email you a confirmation code to set a new password.
              </p>
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-800">
                  {error}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <label htmlFor={emailId} className="text-xs font-semibold uppercase text-jkl-navy-muted">
                  Email address
                </label>
                <input
                  id={emailId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-jkl-navy/80 px-3 py-3 outline-none focus:border-jkl-navy"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-jkl-navy py-3.5 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={onConfirm}>
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-800">
                  {error}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <label htmlFor={codeId} className="text-xs font-semibold uppercase text-jkl-navy-muted">
                  Code
                </label>
                <input
                  id={codeId}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border-2 border-jkl-navy/80 px-3 py-3 outline-none focus:border-jkl-navy"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={passId} className="text-xs font-semibold uppercase text-jkl-navy-muted">
                  New password
                </label>
                <input
                  id={passId}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-jkl-navy/80 px-3 py-3 outline-none focus:border-jkl-navy"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-jkl-navy py-3.5 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}

          {!done ? (
            <p className="mt-6 text-center text-sm">
              <Link to="/login" className="text-jkl-navy underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
