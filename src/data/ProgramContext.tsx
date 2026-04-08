import { isDevAuthBypassEnabled } from "@/lib/devAuth";
import { amplifyDataClient } from "@/lib/amplifyDataClient";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/auth/AuthContext";

type ProgramContextValue = {
  /** Set after the default program is created or loaded; null when cloud data is disabled. */
  programId: string | null;
  loading: boolean;
  error: string | null;
  /** True when local dev auth bypass is on — AppSync calls will fail without Cognito. */
  cloudDataDisabled: boolean;
  refreshProgram: () => Promise<void>;
};

const ProgramContext = createContext<ProgramContextValue | null>(null);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [programId, setProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bypass = isDevAuthBypassEnabled();

  const refreshProgram = useCallback(async () => {
    if (bypass) {
      setProgramId(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const first = await amplifyDataClient.models.Program.list({ limit: 1 });
      if (first.errors?.length) {
        setError(first.errors.map((e) => e.message).join(" "));
        setProgramId(null);
        return;
      }
      const existing = first.data[0];
      if (existing?.id) {
        setProgramId(existing.id);
        return;
      }
      const created = await amplifyDataClient.models.Program.create({
        name: "My program",
        description: "Default program for roster, activities, and highlights.",
      });
      if (created.errors?.length) {
        setError(created.errors.map((e) => e.message).join(" "));
        setProgramId(null);
        return;
      }
      if (!created.data?.id) {
        setError("Could not create a program.");
        setProgramId(null);
        return;
      }
      setProgramId(created.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load program.");
      setProgramId(null);
    } finally {
      setLoading(false);
    }
  }, [bypass]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProgramId(null);
      setError(null);
      setLoading(false);
      return;
    }
    void refreshProgram();
  }, [authLoading, user, refreshProgram]);

  const value = useMemo(
    () => ({
      programId,
      loading: authLoading || loading,
      error,
      cloudDataDisabled: bypass,
      refreshProgram,
    }),
    [programId, authLoading, loading, error, bypass, refreshProgram],
  );

  return (
    <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
  );
}

export function useProgram() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("useProgram must be used within ProgramProvider");
  return ctx;
}
