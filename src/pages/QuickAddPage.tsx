import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

const primary = {
  label: "Add enrolled student",
  to: "/roster?add=1",
  description:
    "Opens the roster with add student focused so you can record an enrolled student on your class roster.",
};

const secondary = [
  { label: "Log attendance", to: "/" },
  { label: "New class activity", to: "/activities?add=1" },
  { label: "Add highlight", to: "/reports?add=1" },
];

export function QuickAddPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader title="Quick add" />
      <div className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8 md:px-8">
        <p className="text-sm text-zinc-600">
          Pick a shortcut—the same actions are available from the + button on each
          screen (roster, activities, reports).
        </p>
        <div className="rounded-2xl border border-jkl-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Enrolled student
          </p>
          <p className="mt-1 text-sm text-zinc-600">{primary.description}</p>
          <Link
            to={primary.to}
            className="mt-4 block rounded-xl bg-jkl-navy px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-jkl-navy-muted"
          >
            {primary.label}
          </Link>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          More
        </p>
        <ul className="space-y-2">
          {secondary.map((a) => (
            <li key={a.label}>
              <Link
                to={a.to}
                className="block rounded-2xl border border-jkl-border bg-white px-4 py-4 text-center text-sm font-semibold text-jkl-navy shadow-sm hover:bg-zinc-50"
              >
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
