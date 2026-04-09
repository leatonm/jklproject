import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { getUrl } from "aws-amplify/storage";
import { cn } from "@/lib/cn";
import { hasStorageInOutputs } from "@/lib/amplifyModelMeta";
import { fetchOEmbedThumbnailUrl } from "@/lib/fetchOEmbedThumbnail";
import { inferYoutubeThumbnailUrl, normalizeHttpUrl } from "@/lib/inferYoutubeThumbnail";

type ResourceLibraryThumbnailProps = {
  linkUrl: string;
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  /** When `video` and no custom thumbnail, resolve YouTube CDN / oEmbed poster from `linkUrl`. */
  kind?: "article" | "video";
  gradientClassName: string;
  className?: string;
  /** `card` = home carousel (h-28); `row` = manage list strip. */
  variant?: "card" | "row";
  /** Show a small play badge (e.g. when `kind` is video). */
  showVideoBadge?: boolean;
};

export function ResourceLibraryThumbnail({
  linkUrl,
  thumbnailUrl,
  thumbnailKey,
  kind = "article",
  gradientClassName,
  className,
  variant = "card",
  showVideoBadge = false,
}: ResourceLibraryThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const direct = thumbnailUrl?.trim();
      if (direct) {
        if (!cancelled) setSrc(direct);
        return;
      }

      if (thumbnailKey?.trim() && hasStorageInOutputs()) {
        try {
          const out = await getUrl({ path: thumbnailKey.trim() });
          if (cancelled) return;
          setSrc(out.url.toString());
          return;
        } catch {
          /* fall through for video poster fallbacks */
        }
      }

      if (kind !== "video") {
        if (!cancelled) setSrc(null);
        return;
      }

      const normalized = normalizeHttpUrl(linkUrl);
      const yt = inferYoutubeThumbnailUrl(normalized);
      if (yt) {
        if (!cancelled) setSrc(yt);
        return;
      }

      const remote = await fetchOEmbedThumbnailUrl(normalized);
      if (!cancelled) setSrc(remote);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl, thumbnailKey, linkUrl, kind]);

  const isRow = variant === "row";

  if (!src) {
    return (
      <div
        className={cn(
          isRow
            ? "flex h-[4.5rem] w-28 shrink-0 items-end justify-center bg-gradient-to-br px-2 pb-2"
            : "flex h-28 shrink-0 items-end justify-center bg-gradient-to-br px-4 pb-3",
          gradientClassName,
          className,
        )}
      >
        {!isRow ? (
          <div className="h-16 w-full rounded-lg bg-white/40" aria-hidden />
        ) : (
          <span className="text-[10px] font-medium text-white/90">No preview</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-zinc-100",
        isRow ? "h-[4.5rem] w-28" : "h-28",
        className,
      )}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {showVideoBadge ? (
        <span
          className="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center justify-center rounded-full bg-black/55 p-1 shadow-sm"
          aria-hidden
        >
          <Play className="h-3 w-3 text-white" fill="currentColor" strokeWidth={0} />
        </span>
      ) : null}
    </div>
  );
}
