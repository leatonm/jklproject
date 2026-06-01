import {
  BookOpen,
  Calendar,
  Home,
  LayoutList,
  PieChart,
  Plus,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useUserRoles } from "@/auth/useUserRoles";
import { LogoMark } from "@/components/LogoMark";
import { cn } from "@/lib/cn";

const item =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-jkl-ink";

export function DesktopSidebar() {
  const { signOutUser } = useAuth();
  const { admin } = useUserRoles();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-jkl-border bg-jkl-cream/80 px-3 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <LogoMark size={40} />
        <div className="leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wide text-jkl-navy-muted">
            JKL
          </p>
          <p className="text-sm font-bold text-jkl-ink">Platform</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        <NavLink
          to="/"
          end
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <Home className="h-5 w-5 shrink-0" aria-hidden />
          Home
        </NavLink>
        <NavLink
          to="/roster"
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <LayoutList className="h-5 w-5 shrink-0" aria-hidden />
          Student roster
        </NavLink>
        <NavLink
          to="/quick-add"
          className={({ isActive }) =>
            cn(item, isActive && "bg-white text-jkl-navy shadow-sm")
          }
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden />
          Quick add
        </NavLink>
        <NavLink
          to="/activities"
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <Calendar className="h-5 w-5 shrink-0" aria-hidden />
          Class activities
        </NavLink>
        <NavLink
          to="/resources"
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
          Resource library
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <PieChart className="h-5 w-5 shrink-0" aria-hidden />
          Highlights &amp; reports
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <Search className="h-5 w-5 shrink-0" aria-hidden />
          Search
        </NavLink>
        {admin ? (
          <NavLink
            to="/admin"
            className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
          >
            <Shield className="h-5 w-5 shrink-0" aria-hidden />
            Admin dashboard
          </NavLink>
        ) : null}
        <NavLink
          to="/profile"
          className={({ isActive }) => cn(item, isActive && "bg-white text-jkl-navy shadow-sm")}
        >
          <Settings className="h-5 w-5 shrink-0" aria-hidden />
          My contact info
        </NavLink>
      </nav>
      <button
        type="button"
        onClick={() => void signOutUser()}
        className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-jkl-ink"
      >
        Sign out
      </button>
    </aside>
  );
}
