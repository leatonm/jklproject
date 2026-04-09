import { normalizeHttpUrl } from "@/lib/inferYoutubeThumbnail";

/**
 * Best-effort page thumbnail for video links (Vimeo, YouTube edge cases, etc.) via oEmbed.
 * Only used when the caller has no custom image and sync YouTube CDN inference failed.
 */
export async function fetchOEmbedThumbnailUrl(pageUrl: string): Promise<string | null> {
  const u = normalizeHttpUrl(pageUrl);
  if (!u) return null;

  let host: string;
  try {
    host = new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  try {
    if (host === "youtu.be" || host.includes("youtube.com")) {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
      );
      if (r.ok) {
        const j = (await r.json()) as { thumbnail_url?: string };
        const t = j.thumbnail_url?.trim();
        if (t) return t;
      }
    }
    if (host.includes("vimeo.com")) {
      const r = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`,
      );
      if (r.ok) {
        const j = (await r.json()) as { thumbnail_url?: string };
        const t = j.thumbnail_url?.trim();
        if (t) return t;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(u)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { thumbnail_url?: string; error?: string };
    if (j.error) return null;
    return j.thumbnail_url?.trim() || null;
  } catch {
    return null;
  }
}
