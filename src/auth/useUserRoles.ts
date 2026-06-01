import { useEffect, useState } from "react";
import { fetchUserRoles, isAdmin, type AppRole } from "@/lib/userRoles";

export function useUserRoles() {
  const [roles, setRoles] = useState<AppRole[]>(["instructor"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchUserRoles()
      .then((r) => {
        if (!cancelled) setRoles(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, loading, admin: isAdmin(roles) };
}
