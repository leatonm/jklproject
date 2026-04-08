import { cn } from "@/lib/cn";

type DataEnvironmentBannerProps = {
  cloudDataDisabled: boolean;
  error: string | null;
  className?: string;
};

/** Shown when dev auth bypass is on or the program failed to load. */
export function DataEnvironmentBanner({
  cloudDataDisabled,
  error,
  className,
}: DataEnvironmentBannerProps) {
  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900",
          className,
        )}
      >
        {error}
      </div>
    );
  }
  if (cloudDataDisabled) {
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950",
          className,
        )}
      >
        Cloud data is off while{" "}
        <code className="rounded bg-amber-100/80 px-1">VITE_DEV_AUTH_BYPASS</code>{" "}
        is enabled. Sign in with Cognito (or disable the bypass) to load DynamoDB
        records.
      </div>
    );
  }
  return null;
}
