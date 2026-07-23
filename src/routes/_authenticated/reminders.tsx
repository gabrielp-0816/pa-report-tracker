import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Mail,
  ExternalLink,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckSquare,
} from "lucide-react";
import { fmtDate, fmtDateTime, daysBetween } from "@/lib/format";
import { BulkEmailModal, PendingFaculty } from "@/components/bulk-email-modal";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminders — TAAS 2025" }] }),
  component: RemindersPage,
});

type Pending = {
  id: string;
  faculty_name: string;
  institution: string | null;
  date_activity: string | null;
  date_received: string | null;
  task_rendered: string | null;
};

type Contact = { faculty_name: string; email: string | null };

type LogEntry = {
  id: string;
  faculty_name: string;
  email: string | null;
  sent_at: string;
  message: string | null;
};

function RemindersPage() {
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["pending-pars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,faculty_name,institution,date_activity,date_received,task_rendered")
        .is("par_received_at", null)
        .order("date_received", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as Pending[];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculty_contacts").select("faculty_name,email");
      if (error) throw error;
      return new Map((data as Contact[]).map((c) => [c.faculty_name, c.email]));
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["reminder-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_logs")
        .select("id,faculty_name,email,sent_at,message")
        .order("sent_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as LogEntry[];
    },
  });

  const logReminder = useMutation({
    mutationFn: async ({
      activity_id,
      faculty_name,
      email,
      message,
    }: {
      activity_id: string;
      faculty_name: string;
      email: string | null;
      message: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("reminder_logs").insert({
        activity_id,
        faculty_name,
        email,
        message,
        channel: "email",
        status: "sent",
        sent_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder logged");
      qc.invalidateQueries({ queryKey: ["reminder-logs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to log reminder"),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Pending[]>();
    for (const p of pending ?? []) {
      if (!map.has(p.faculty_name)) map.set(p.faculty_name, []);
      map.get(p.faculty_name)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [pending]);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [modalPreselected, setModalPreselected] = useState<string[]>([]);
  const [selectedProfessor, setSelectedProfessor] = useState<{
    name: string;
    items: Pending[];
    email: string | null;
  } | null>(null);

  const facultyListForModal: PendingFaculty[] = useMemo(() => {
    return grouped.map(([name, items]) => {
      const email = contacts?.get(name) ?? null;
      const oldest = items[0];
      const daysOld = daysBetween(oldest?.date_received);
      const overdue = (daysOld ?? 0) > 14;
      return {
        faculty_name: name,
        email,
        count: items.length,
        overdue,
        oldestActivityId: oldest?.id,
      };
    });
  }, [grouped, contacts]);

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    setPageIndex(0);
  }, [grouped.length]);

  useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  const paginated = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return grouped.slice(start, start + PAGE_SIZE);
  }, [grouped, pageIndex]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Reminders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pending?.length ?? 0} pending PARs across {grouped.length} faculty. Send follow-ups and
            keep a record of every reminder.
          </p>
        </div>
        <button
          onClick={() => {
            setModalPreselected([]);
            setBulkModalOpen(true);
          }}
          disabled={grouped.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
        >
          <Mail className="h-4 w-4" /> Bulk Email Reminders
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] lg:grid-cols-1 grid-cols-1">
        <div className="space-y-3 min-w-0">
          {isLoading && <p className="text-sm text-muted-foreground">Loading pending PARs…</p>}
          {!isLoading && grouped.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No pending PARs. Everything is up to date. 🎉
            </div>
          )}
          {paginated.map(([name, items]) => {
            const email = contacts?.get(name) ?? null;
            const oldest = items[0];
            const daysOld = daysBetween(oldest.date_received);
            const overdue = (daysOld ?? 0) > 14;

            const subject = encodeURIComponent(
              `Reminder: Post-Activity Report submission (${items.length} pending)`,
            );
            const body = encodeURIComponent(
              `Dear ${name},\n\nThis is a friendly reminder from the office regarding your Post-Activity Report(s) that have not yet been received:\n\n` +
                items
                  .slice(0, 10)
                  .map(
                    (i) =>
                      `• ${i.task_rendered ?? "Activity"} — ${i.institution ?? "—"} (${fmtDate(i.date_activity ?? i.date_received)})`,
                  )
                  .join("\n") +
                `\n\nPlease submit your PAR at your earliest convenience through the usual channel.\n\nThank you,\nAdministrative Office`,
            );
            const mailto = email ? `mailto:${email}?subject=${subject}&body=${body}` : null;

            return (
              <div key={name} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        onClick={() => setSelectedProfessor({ name, items, email })}
                        className="font-display text-base font-semibold hover:text-primary hover:underline cursor-pointer transition-colors"
                      >
                        {name}
                      </p>
                      <span
                        onClick={() => setSelectedProfessor({ name, items, email })}
                        className="rounded-full bg-warning/25 hover:bg-warning/35 cursor-pointer px-2 py-0.5 text-xs font-medium text-warning-foreground transition-all"
                      >
                        {items.length} pending
                      </span>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {daysOld}d overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {email ? (
                        <>
                          <Mail className="mr-1 inline h-3 w-3" />
                          {email}
                        </>
                      ) : (
                        <span className="italic">No email on file — add one in Faculty</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {mailto && (
                      <a
                        href={mailto}
                        onClick={() =>
                          logReminder.mutate({
                            activity_id: oldest.id,
                            faculty_name: name,
                            email,
                            message: `Emailed reminder for ${items.length} pending PAR(s)`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <Mail className="h-3.5 w-3.5" /> Send email
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    )}
                    <button
                      onClick={() =>
                        logReminder.mutate({
                          activity_id: oldest.id,
                          faculty_name: name,
                          email,
                          message: `Manual follow-up recorded (${items.length} pending PAR(s))`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Log follow-up
                    </button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {items.slice(0, 4).map((i) => (
                    <li
                      key={i.id}
                      className="flex items-start justify-between gap-3 border-t border-border pt-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.task_rendered ?? "Activity"}</p>
                        <p className="truncate text-muted-foreground">{i.institution ?? "—"}</p>
                      </div>
                      <div className="shrink-0 text-right text-muted-foreground">
                        <Clock className="inline h-3 w-3" />{" "}
                        {fmtDate(i.date_activity ?? i.date_received)}
                      </div>
                    </li>
                  ))}
                  {items.length > 4 && (
                    <li
                      onClick={() => setSelectedProfessor({ name, items, email })}
                      className="pt-1 text-xs text-muted-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                    >
                      + {items.length - 4} more… (click to view all)
                    </li>
                  )}
                </ul>
              </div>
            );
          })}

          {grouped.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs">
              <span className="text-muted-foreground">
                Page {pageIndex + 1} of {pageCount} ({grouped.length} faculty)
              </span>

              <div className="flex items-center gap-2">
                <label htmlFor="reminder-skip-page" className="text-muted-foreground">
                  Skip to page
                </label>
                <input
                  id="reminder-skip-page"
                  type="number"
                  min={1}
                  max={pageCount}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(pageInput, 10);
                      if (!Number.isNaN(n))
                        setPageIndex(Math.max(0, Math.min(n - 1, pageCount - 1)));
                    }
                  }}
                  className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => {
                    const n = parseInt(pageInput, 10);
                    if (!Number.isNaN(n)) setPageIndex(Math.max(0, Math.min(n - 1, pageCount - 1)));
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Go
                </button>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                  disabled={pageIndex === 0}
                  className="rounded-md border border-input p-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPageIndex((i) => Math.min(pageCount - 1, i + 1))}
                  disabled={pageIndex >= pageCount - 1}
                  className="rounded-md border border-input p-1.5 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3 min-w-0">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold">How reminders work</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Click <span className="font-medium text-foreground">Send email</span> to open your
              mail client with a pre-filled reminder message and log the follow-up automatically.
              Add faculty emails in the Faculty page to enable this.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display font-semibold">Recent reminder log</h3>
            <div className="mt-3 divide-y divide-border">
              {(logs ?? []).length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No reminders sent yet.</p>
              )}
              {(logs ?? []).map((l) => (
                <div key={l.id} className="py-2.5">
                  <p className="text-sm font-medium">{l.faculty_name}</p>
                  <p className="text-xs text-muted-foreground">{l.message ?? "Reminder"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{fmtDateTime(l.sent_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <BulkEmailModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        facultyList={facultyListForModal}
        preselectedNames={modalPreselected}
      />

      {selectedProfessor && (
        <ProfessorActivitiesModal
          name={selectedProfessor.name}
          email={selectedProfessor.email}
          items={selectedProfessor.items}
          onClose={() => setSelectedProfessor(null)}
        />
      )}
    </div>
  );
}

function ProfessorActivitiesModal({
  name,
  email,
  items,
  onClose,
}: {
  name: string;
  email: string | null;
  items: Pending[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Faculty Pending PARs
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold">{name}</h2>
            {email && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> {email}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 px-4 py-2.5 rounded-lg border border-border/50">
            <span>Total pending activities requiring PAR:</span>
            <span className="font-semibold text-warning-foreground bg-warning/25 px-2 py-0.5 rounded-full">
              {items.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {items.map((i, index) => {
              const daysOld = daysBetween(i.date_received);
              const overdue = (daysOld ?? 0) > 14;
              return (
                <Link
                  key={i.id}
                  to="/activities"
                  search={{ id: i.id } as any}
                  className="rounded-xl border border-border/70 bg-card p-4 hover:bg-muted/10 hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        #{index + 1}
                      </span>
                      <p className="font-medium text-sm text-foreground truncate">
                        {i.task_rendered ?? "Activity"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate pl-6">
                      {i.institution ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-6 sm:pl-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {fmtDate(i.date_activity ?? i.date_received)}
                    </span>
                    {overdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        <AlertTriangle className="h-2.5 w-2.5" /> {daysOld}d overdue
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-md border border-input px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
