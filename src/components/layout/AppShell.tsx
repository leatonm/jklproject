import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-white md:flex-row">
      <DesktopSidebar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
