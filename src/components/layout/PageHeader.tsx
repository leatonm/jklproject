import type { ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  className?: string;
  action?: ReactNode;
};

export function PageHeader({
  title,
  className,
  action,
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
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
