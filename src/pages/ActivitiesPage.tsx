import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function useMonthGrid(year: number, monthIndex: number) {
  return useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const daysInMonth = last.getDate();
    const startPad = first.getDay();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, monthIndex, i - startPad + 1);
      cells.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, monthIndex, day), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const lastCell = cells[cells.length - 1]!.date;
      const next = new Date(lastCell);
      next.setDate(next.getDate() + 1);
      cells.push({ date: next, inMonth: false });
    }
    return cells;
  }, [year, monthIndex]);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ActivitiesPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => new Date());
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();
  const grid = useMonthGrid(year, monthIndex);
  const label = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  function shiftMonth(delta: number) {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <PageHeader
        title="Class Activities"
        showReportsLink
        action={
          <button
            type="button"
            className="rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50"
            aria-label="Add activity"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        <div className="overflow-hidden rounded-2xl border border-jkl-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-jkl-border px-4 py-3">
            <p className="text-sm font-bold text-jkl-ink">{label}</p>
            <div className="flex items-center gap-1">
              <CalendarDays className="mr-1 h-5 w-5 text-zinc-400" aria-hidden />
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-full p-2 text-jkl-navy hover:bg-zinc-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-full p-2 text-jkl-navy hover:bg-zinc-100"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 px-2 pb-2 pt-1 text-center text-xs font-semibold text-zinc-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-zinc-100 px-2 pb-4">
            {grid.map(({ date, inMonth }) => {
              const isSelected = sameDay(date, selected);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cn(
                    "flex min-h-10 items-center justify-center bg-white py-2 text-sm font-medium",
                    !inMonth && "text-zinc-300",
                    inMonth && "text-jkl-ink",
                    isSelected &&
                      inMonth &&
                      "relative z-10 rounded-full bg-jkl-navy text-white",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-jkl-ink">Your Calendar</h2>
          <div className="mt-2 flex gap-6 border-b border-jkl-border">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
              className={cn(
                "pb-3 text-sm font-semibold",
                tab === "upcoming"
                  ? "border-b-2 border-jkl-navy text-jkl-navy"
                  : "text-zinc-400",
              )}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setTab("past")}
              className={cn(
                "pb-3 text-sm font-semibold",
                tab === "past"
                  ? "border-b-2 border-jkl-navy text-jkl-navy"
                  : "text-zinc-400",
              )}
            >
              Past
            </button>
          </div>
          <p className="py-16 text-center text-2xl font-semibold text-zinc-300">
            No item present
          </p>
        </div>
      </div>
    </div>
  );
}
