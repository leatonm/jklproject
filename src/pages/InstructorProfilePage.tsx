import { useCallback, useEffect, useState } from "react";
import { DataEnvironmentBanner } from "@/components/DataEnvironmentBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  getInstructorProfile,
  hasRuntimeInstructorProfileClient,
  saveInstructorProfile,
} from "@/data/programDataQueries";
import { useProgram } from "@/data/ProgramContext";
import { useAuth } from "@/auth/AuthContext";
import { useUserRoles } from "@/auth/useUserRoles";

export function InstructorProfilePage() {
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const { error: programError, cloudDataDisabled } = useProgram();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileApi = hasRuntimeInstructorProfileClient();

  const load = useCallback(async () => {
    if (cloudDataDisabled || !profileApi) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getInstructorProfile();
      if (res.errors?.length) {
        setError(res.errors.map((e) => e.message).join(" "));
        return;
      }
      if (res.data) {
        setDisplayName(res.data.displayName ?? "");
        setPhone(res.data.phone ?? "");
        setEmail(res.data.email ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [cloudDataDisabled, profileApi]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cloudDataDisabled || !profileApi) return;
    setSaving(true);
    setError(null);
    try {
      const res = (await saveInstructorProfile({
        displayName,
        phone,
        email,
      })) as { errors?: { message: string }[] };
      if (res.errors?.length) {
        setError(res.errors.map((er) => er.message).join(" "));
        return;
      }
      setToast("Contact information saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const roleLabel = roles.includes("admin") ? "Administrator" : "Instructor";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader title="My contact info" />
      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-6 md:px-8">
        <DataEnvironmentBanner cloudDataDisabled={cloudDataDisabled} error={programError ?? error} />

        <div className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-zinc-500">Signed in as</p>
          <p className="mt-1 font-semibold text-jkl-ink">{roleLabel}</p>
          {user?.userId ? (
            <p className="mt-1 text-xs text-zinc-500">Account ID: {user.userId.slice(0, 8)}…</p>
          ) : null}
        </div>

        {!profileApi && !cloudDataDisabled ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Deploy the latest backend to save instructor phone and email to the cloud.
          </p>
        ) : null}

        {toast ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            {toast}{" "}
            <button type="button" className="font-semibold underline" onClick={() => setToast(null)}>
              Dismiss
            </button>
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-jkl-border bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
            Admins use this phone for SMS reminders when weekly reports are overdue.
          </p>
          {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="prof-name">
              Display name
            </label>
            <input
              id="prof-name"
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="prof-email">
              Email
            </label>
            <input
              id="prof-email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500" htmlFor="prof-phone">
              Phone
            </label>
            <input
              id="prof-phone"
              type="tel"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              className="mt-1 w-full rounded-xl border border-jkl-border px-3 py-2 text-sm"
              autoComplete="tel"
              placeholder="(555) 555-0100"
            />
          </div>
          <button
            type="submit"
            disabled={saving || cloudDataDisabled || !profileApi}
            className="w-full rounded-xl bg-jkl-navy py-2.5 text-sm font-semibold text-white hover:bg-jkl-navy-muted disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save contact info"}
          </button>
        </form>
      </div>
    </div>
  );
}
