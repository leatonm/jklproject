type LogoMarkProps = {
  className?: string;
  size?: number;
};

/** Uses `public/jkl-logo.png` (your 1024×1024 asset) when present; falls back to `public/jkl-icon.svg`. */
export function LogoMark({ className, size = 36 }: LogoMarkProps) {
  return (
    <img
      src="/jkl-logo.png"
      alt="JKL"
      width={size}
      height={size}
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.src.endsWith("/jkl-icon.svg")) return;
        el.onerror = null;
        el.src = "/jkl-icon.svg";
      }}
    />
  );
}
