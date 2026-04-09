/**
 * Returns a YouTube CDN thumbnail URL when `urlStr` is a recognizable watch/embed/short URL.
 */
export function inferYoutubeThumbnailUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
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
