import { Search as SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export function SearchPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <PageHeader title="Search" />
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8 md:px-8">
        <label className="flex items-center gap-3 rounded-2xl border border-jkl-border bg-zinc-50 px-4 py-3 shadow-inner">
          <SearchIcon className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
          <input
            type="search"
            placeholder="Students, activities, resources…"
            className="min-w-0 flex-1 bg-transparent text-sm text-jkl-ink outline-none placeholder:text-zinc-400"
            autoComplete="off"
          />
        </label>
        <p className="mt-8 text-center text-sm text-zinc-500">
          Search will connect to roster and scheduling data in Phase 2.
        </p>
      </div>
    </div>
  );
}
