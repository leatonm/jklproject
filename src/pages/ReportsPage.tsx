import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";

export function ReportsPage() {
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <PageHeader
        title="Highlights & Reports"
        action={
          <button
            type="button"
            className="rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50"
            aria-label="Add report"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="border-b border-jkl-border px-4 md:px-8">
        <div className="mx-auto flex max-w-3xl gap-8">
          <button
            type="button"
            onClick={() => setRange("weekly")}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors",
              range === "weekly"
                ? "border-jkl-navy text-jkl-navy"
                : "border-transparent text-zinc-400 hover:text-zinc-600",
            )}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setRange("monthly")}
            className={cn(
              "border-b-2 pb-3 text-sm font-semibold transition-colors",
              range === "monthly"
                ? "border-jkl-navy text-jkl-navy"
                : "border-transparent text-zinc-400 hover:text-zinc-600",
            )}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-2xl font-semibold text-zinc-300">No item present</p>
      </div>
    </div>
  );
}
