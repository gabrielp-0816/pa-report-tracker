import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Users, BellRing } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/activities", label: "Activities", icon: ClipboardList },
  { to: "/faculty", label: "Faculty", icon: Users },
  { to: "/reminders", label: "Reminders", icon: BellRing },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground font-display font-bold">F</div>
          <div>
            <p className="font-display text-lg font-semibold leading-none">FPARTS</p>
            <p className="text-xs text-sidebar-foreground/60">PAR Tracking</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-sidebar-foreground/60">Faculty Post-Activity</p>
          <p className="text-sm font-medium">Report Tracking System</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-display font-bold">F</div>
            <span className="font-display font-semibold">FPARTS</span>
          </Link>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
