import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

const actions = [
  { label: "Log attendance", to: "/" },
  { label: "New activity", to: "/activities" },
  { label: "Add student", to: "/roster" },
];

export function QuickAddPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50">
      <PageHeader title="Quick add" />
      <div className="mx-auto w-full max-w-md flex-1 space-y-3 px-4 py-8 md:px-8">
        <p className="text-sm text-zinc-600">
          Choose what you want to add. These links are placeholders until the
          attendance and scheduling APIs are wired up.
        </p>
        <ul className="space-y-2">
          {actions.map((a) => (
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
