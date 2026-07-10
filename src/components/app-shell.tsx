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
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r-2 border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground font-display text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.15)]">
            F
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-none tracking-tight">FPARTS</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/70">PAR Tracking</p>
          </div>
        </div>

        <div className="mx-4 mb-4 rounded-2xl border-2 border-sidebar-border/70 bg-sidebar-accent px-4 py-3">
          <p className="font-display text-sm font-semibold">Faculty Post-Activity</p>
          <p className="text-xs text-sidebar-foreground/75">Report Tracking System</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_3px_0_0_rgba(0,0,0,0.2)] translate-y-[-1px]"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t-2 border-sidebar-border px-6 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/70">v1 · Bright edition</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-display font-bold">F</div>
            <span className="font-display font-bold text-sidebar-foreground">FPARTS</span>
          </Link>
        </header>
        <nav className="flex gap-1.5 overflow-x-auto border-b-2 border-sidebar-border bg-sidebar px-3 py-2 md:hidden">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "bg-sidebar-accent text-sidebar-accent-foreground"
                }`}
              >
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
