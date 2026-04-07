/** Local dev only — never enabled in production builds. */

export const DEV_TEST_USERNAME = "test";
export const DEV_TEST_PASSWORD = "test";

export function isDevAuthBypassEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";
}

export function isDevTestCredentials(
  normalizedEmail: string,
  password: string,
): boolean {
  return (
    import.meta.env.DEV &&
    normalizedEmail === DEV_TEST_USERNAME &&
    password === DEV_TEST_PASSWORD
  );
}
