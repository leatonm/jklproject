import { CheckSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";

const students = [
  {
    id: "1",
    name: "Joe Test",
    grade: "Grade 9",
    date: "Wed, Oct 2",
    attendancePct: 0,
    signature: "signed" as const,
  },
  {
    id: "2",
    name: "Mary Test",
    grade: "Grade 11",
    date: "Thu, Oct 16",
    attendancePct: 0,
    signature: "unsent" as const,
  },
];

export function RosterPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader
        title="Student Roster"
        showReportsLink
        action={
          <button
            type="button"
            className="rounded-full border border-jkl-border bg-white p-2 text-jkl-navy shadow-sm hover:bg-zinc-50"
            aria-label="Add student"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 md:px-8">
        {students.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-jkl-ink">{s.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {s.grade}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {s.date}
                  </span>
                </div>
              </div>
              <p className="text-sm">
                <span className="font-semibold text-jkl-blue tabular-nums">
                  {s.attendancePct}%
                </span>
                <span className="text-zinc-500"> Avg. Attendance</span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              <span>eSignature Status:</span>
              {s.signature === "signed" ? (
                <span className="inline-flex items-center gap-1 font-medium text-jkl-ink">
                  Signed
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-200 bg-zinc-50">
                    <CheckSquare className="h-4 w-4 text-jkl-green" aria-hidden />
                  </span>
                </span>
              ) : (
                <span className="font-medium">Not Sent</span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-jkl-navy px-4 py-2 text-sm font-semibold text-jkl-navy hover:bg-jkl-navy/5"
              >
                Take Note / Delete
              </button>
              {s.signature === "unsent" ? (
                <button
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    "bg-jkl-navy hover:bg-jkl-navy-muted",
                  )}
                >
                  Send Email
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
