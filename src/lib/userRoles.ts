import { fetchAuthSession } from "aws-amplify/auth";
import { isDevAuthBypassEnabled } from "@/lib/devAuth";

export type AppRole = "admin" | "instructor";

const ADMIN_GROUP = "Admin";
const INSTRUCTOR_GROUP = "Instructor";

/** Resolve Cognito group membership; dev bypass defaults to admin for testing. */
export async function fetchUserRoles(): Promise<AppRole[]> {
  if (isDevAuthBypassEnabled()) return ["admin", "instructor"];

  try {
    const session = await fetchAuthSession();
    const groups =
      (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[] | undefined) ?? [];
    const roles: AppRole[] = [];
    if (groups.includes(ADMIN_GROUP)) roles.push("admin");
    if (groups.includes(INSTRUCTOR_GROUP) || roles.length === 0) roles.push("instructor");
    return roles;
  } catch {
    return ["instructor"];
  }
}

export function isAdmin(roles: AppRole[]): boolean {
  return roles.includes("admin");
}
