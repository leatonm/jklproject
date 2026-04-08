import { Calendar, Home, LayoutList, PieChart, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const linkClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-zinc-500 transition-colors";

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-jkl-border bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between px-2 pt-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(linkClass, isActive && "text-jkl-navy")
          }
        >
          {({ isActive }) => (
            <>
              <Home
                className={cn("h-6 w-6", isActive && "text-jkl-navy")}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span>Home</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/roster"
          className={({ isActive }) =>
            cn(linkClass, isActive && "text-jkl-navy")
          }
        >
          {({ isActive }) => (
            <>
              <LayoutList
                className={cn("h-6 w-6", isActive && "text-jkl-navy")}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span>Roster</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/quick-add"
          className={({ isActive }) =>
            cn(
              "-mt-6 flex flex-col items-center",
              isActive && "text-jkl-navy",
            )
          }
          aria-label="Quick add"
        >
          {({ isActive }) => (
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full bg-jkl-accent-red text-white shadow-lg shadow-jkl-accent-red/30",
                isActive && "ring-2 ring-jkl-navy ring-offset-2 ring-offset-white",
              )}
            >
              <Plus className="h-8 w-8" strokeWidth={2.5} aria-hidden />
            </span>
          )}
        </NavLink>
        <NavLink
          to="/activities"
          className={({ isActive }) =>
            cn(linkClass, isActive && "text-jkl-navy")
          }
        >
          {({ isActive }) => (
            <>
              <Calendar
                className={cn("h-6 w-6", isActive && "text-jkl-navy")}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span>Activities</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/reports"
          aria-label="Highlights and reports"
          className={({ isActive }) =>
            cn(linkClass, isActive && "text-jkl-navy")
          }
        >
          {({ isActive }) => (
            <>
              <PieChart
                className={cn("h-6 w-6", isActive && "text-jkl-navy")}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span>Reports</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
