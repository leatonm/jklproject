/** SOW: simplified login (case-insensitive email). */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const REMEMBER_KEY = "jkl_remember_email";

export function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string) {
  try {
    if (email) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
}
