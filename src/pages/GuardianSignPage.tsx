import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { submitGuardianConsent } from "@/data/programDataQueries";
import { LogoMark } from "@/components/LogoMark";

export function GuardianSignPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const studentId = params.get("studentId") ?? "";
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !studentId) {
      setResult({ ok: false, message: "Invalid consent link. Use the link from your email." });
      return;
    }
    if (!signerName.trim()) {
      setResult({ ok: false, message: "Please enter your full legal name." });
      return;
    }
    if (!agreed) {
      setResult({ ok: false, message: "Please confirm you agree to the waiver terms." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await submitGuardianConsent({
        token,
        studentId,
        signerName: signerName.trim(),
      });
      if (res.errors?.length) {
        setResult({ ok: false, message: res.errors.map((er) => er.message).join(" ") });
        return;
      }
      setResult(res.data ?? { ok: true, message: "Consent recorded." });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Could not submit consent.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="border-b border-jkl-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <LogoMark size={36} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-jkl-navy-muted">
              Just Keep Livin Foundation
            </p>
            <p className="text-sm font-bold text-jkl-ink">Waiver &amp; permission form</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {result?.ok ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <h1 className="text-lg font-bold">Thank you</h1>
            <p className="mt-2 text-sm">{result.message}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <article className="rounded-2xl border border-jkl-border bg-white p-6 text-sm text-zinc-700 shadow-sm">
              <h1 className="text-lg font-bold text-jkl-ink">
                Waiver, Liability, and Publicity Release
              </h1>
              <p className="mt-3">
                Dear Legal Guardian, we are delighted to welcome your child to the Just Keep
                Livin Foundation after-school program. To ensure safe participation, please
                review and sign this form.
              </p>
              <p className="mt-3">
                I confirm that I am the parent or legal guardian. I consent to my
                child&apos;s participation in JKL activities, including photos and video for
                program reporting as described by the foundation.
              </p>
            </article>
            {result && !result.ok ? (
              <p className="text-sm text-red-600" role="alert">
                {result.message}
              </p>
            ) : null}
            <div>
              <label className="text-xs font-semibold text-zinc-500" htmlFor="signer-name">
                Your full legal name
              </label>
              <input
                id="signer-name"
                value={signerName}
                onChange={(ev) => setSignerName(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
                autoComplete="name"
                required
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(ev) => setAgreed(ev.target.checked)}
                className="mt-1"
              />
              I have read and agree to the waiver, liability, and publicity release terms.
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-jkl-navy py-3 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Sign and submit"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
