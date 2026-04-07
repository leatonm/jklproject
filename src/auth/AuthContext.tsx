import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isDevAuthBypassEnabled } from "@/lib/devAuth";

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

/** Minimal shape Cognito returns; used only for dev mock UI state. */
const MOCK_DEV_USER = {
  username: "test",
  userId: "jkl-dev-mock-user",
} as AuthUser;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOutUser: () => Promise<void>;
  /** Dev only: sign in without Cognito (test / test or bypass). */
  signInDevMock: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const bypassOn = isDevAuthBypassEnabled();
  const [user, setUser] = useState<AuthUser | null>(() =>
    bypassOn ? MOCK_DEV_USER : null,
  );
  const [loading, setLoading] = useState(() => !bypassOn);
  const devMockRef = useRef(bypassOn);

  const refresh = useCallback(async () => {
    if (devMockRef.current || isDevAuthBypassEnabled()) {
      setUser(MOCK_DEV_USER);
      return;
    }
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  const signInDevMock = useCallback(() => {
    devMockRef.current = true;
    setUser(MOCK_DEV_USER);
  }, []);

  useEffect(() => {
    if (bypassOn) {
      return;
    }

    let cancelled = false;
    void getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const remove = Hub.listen("auth", ({ payload }) => {
      if (devMockRef.current) return;
      if (payload.event === "signedIn") void refresh();
      if (payload.event === "signedOut") setUser(null);
    });

    return () => {
      cancelled = true;
      remove();
    };
  }, [bypassOn, refresh]);

  const signOutUser = useCallback(async () => {
    if (devMockRef.current) {
      devMockRef.current = false;
      setUser(null);
      return;
    }
    try {
      await signOut();
    } catch {
      /* not signed in to Cognito */
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      signOutUser,
      signInDevMock,
    }),
    [user, loading, refresh, signOutUser, signInDevMock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
