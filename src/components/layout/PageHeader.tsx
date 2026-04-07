import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "@/components/LogoMark";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  className?: string;
  action?: ReactNode;
  /** Show link to Reports (mobile-friendly when bottom nav has no Reports slot). */
  showReportsLink?: boolean;
};

export function PageHeader({
  title,
  className,
  action,
  showReportsLink,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 border-b border-jkl-border bg-white/90 px-4 py-3 backdrop-blur md:px-6",
        className,
      )}
    >
      <LogoMark size={32} className="shrink-0 rounded-lg" />
      <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-jkl-ink">
        {title}
      </h1>
      {showReportsLink ? (
        <Link
          to="/reports"
          className="hidden shrink-0 text-sm font-semibold text-jkl-navy underline-offset-4 hover:underline md:inline"
        >
          Reports
        </Link>
      ) : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
