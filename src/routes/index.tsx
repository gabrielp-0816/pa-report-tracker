import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, BellRing, LineChart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-display font-bold">F</div>
            <div>
              <p className="font-display text-lg font-semibold leading-none">FPARTS</p>
              <p className="text-xs text-muted-foreground">Post-Activity Report Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Open dashboard</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
              For university administrative staff
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-tight text-foreground md:text-6xl">
              Track every Post-Activity Report — never chase the same faculty twice.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              FPARTS gives your office a single, professional dashboard to monitor PAR submissions, spot overdue reports, and send timely reminders — without changing how faculty submit today.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Get started</Link>
              <Link to="/dashboard" className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-muted">View live dashboard</Link>
            </div>
            <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
              Not a submission portal. A tracking and reminder system.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: ClipboardCheck, title: "Central PAR ledger", body: "Every activity, faculty, and status in one filterable table." },
              { Icon: LineChart, title: "Compliance analytics", body: "See submission rates by month, department, and campus." },
              { Icon: BellRing, title: "Reminders that stick", body: "Send and log follow-ups so nothing falls through the cracks." },
              { Icon: ShieldCheck, title: "Staff-only access", body: "Role-based sign-in keeps the ledger private and auditable." },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-4 font-display font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FPARTS — Faculty Post-Activity Report Tracking and Reminder System.
        </div>
      </footer>
    </div>
  );
}
