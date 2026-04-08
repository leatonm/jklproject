import { useEffect, useState } from "react";
import { getUrl } from "aws-amplify/storage";
import { cn } from "@/lib/cn";
import { hasStorageInOutputs } from "@/lib/amplifyModelMeta";

type ActivityCoverImageProps = {
  coverImageUrl?: string | null;
  coverImageKey?: string | null;
  gradientClassName: string;
  className?: string;
  /** `thumb` = small square for list rows; `card` = home carousel height. */
  variant?: "card" | "thumb";
};

export function ActivityCoverImage({
  coverImageUrl,
  coverImageKey,
  gradientClassName,
  className,
  variant = "card",
}: ActivityCoverImageProps) {
  const [src, setSrc] = useState<string | null>(coverImageUrl?.trim() || null);

  useEffect(() => {
    if (coverImageUrl?.trim()) {
      setSrc(coverImageUrl.trim());
      return;
    }
    if (!coverImageKey?.trim() || !hasStorageInOutputs()) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void getUrl({ path: coverImageKey.trim() })
      .then((out) => {
        if (!cancelled) setSrc(out.url.toString());
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [coverImageUrl, coverImageKey]);

  const isThumb = variant === "thumb";

  if (!src) {
    return (
      <div
        className={cn(
          isThumb
            ? "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br"
            : "flex h-28 shrink-0 items-end justify-center bg-gradient-to-br px-4 pb-3",
          gradientClassName,
          className,
        )}
      >
        {!isThumb ? (
          <div className="h-16 w-full rounded-lg bg-white/40" aria-hidden />
        ) : (
          <span className="text-[10px] font-medium text-white/80">No photo</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        isThumb ? "h-16 w-16 rounded-xl" : "h-28",
        className,
      )}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
