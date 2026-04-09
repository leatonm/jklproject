import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { getUrl } from "aws-amplify/storage";
import { cn } from "@/lib/cn";
import { hasStorageInOutputs } from "@/lib/amplifyModelMeta";
import { inferYoutubeThumbnailUrl } from "@/lib/inferYoutubeThumbnail";

type ResourceLibraryThumbnailProps = {
  linkUrl: string;
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  /** When no stored thumbnail, try YouTube poster from `linkUrl`. */
  preferYoutubePoster?: boolean;
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
  preferYoutubePoster = true,
  gradientClassName,
  className,
  variant = "card",
  showVideoBadge = false,
}: ResourceLibraryThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const direct = thumbnailUrl?.trim();
    if (direct) {
      setSrc(direct);
      return;
    }

    const ytFallback = preferYoutubePoster
      ? inferYoutubeThumbnailUrl(linkUrl)
      : null;

    if (!thumbnailKey?.trim() || !hasStorageInOutputs()) {
      setSrc(ytFallback);
      return;
    }

    let cancelled = false;
    void getUrl({ path: thumbnailKey.trim() })
      .then((out) => {
        if (!cancelled) setSrc(out.url.toString());
      })
      .catch(() => {
        if (!cancelled) setSrc(ytFallback);
      });
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl, thumbnailKey, linkUrl, preferYoutubePoster]);

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
