/** Ensures `https://` so `new URL()` and host checks work for pasted links. */
export function normalizeHttpUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Returns a YouTube CDN thumbnail URL when `urlStr` is a recognizable watch/embed/short URL.
 */
export function inferYoutubeThumbnailUrl(urlStr: string): string | null {
  const normalized = normalizeHttpUrl(urlStr);
  if (!normalized) return null;
  try {
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]?.trim();
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://img.youtube.com/vi/${v}/hqdefault.jpg`;
      const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://img.youtube.com/vi/${embed[1]}/hqdefault.jpg`;
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://img.youtube.com/vi/${shorts[1]}/hqdefault.jpg`;
    }
  } catch {
    return null;
  }
  return null;
}
