import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, ArrowUpDown, ChevronLeft, ChevronRight, X, Plus, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Activities — FPARTS" }] }),
  component: ActivitiesPage,
});

type Activity = {
  id: string;
  entry_no: number | null;
  date_received: string | null;
  time_received: string | null;
  date_release_so: string | null;
  time_release_so: string | null;
  dts_ref: string | null;
  faculty_name: string;
  position: string | null;
  task_rendered: string | null;
  date_activity: string | null;
  institution: string | null;
  par_received_at: string | null;
  contribution: string | null;
  beneficiaries: string | null;
  coc_issued_at: string | null;
  with_coc: string | null;
  notes: string | null;
};

type ActivityFormValues = Omit<Activity, "id" | "par_received_at" | "coc_issued_at"> & {
  par_received_at: string | null;
  coc_issued_at: string | null;
};

const EMPTY_FORM: ActivityFormValues = {
  entry_no: null,
  date_received: null,
  time_received: null,
  date_release_so: null,
  time_release_so: null,
  dts_ref: null,
  faculty_name: "",
  position: null,
  task_rendered: null,
  date_activity: null,
  institution: null,
  par_received_at: null,
  contribution: null,
  beneficiaries: null,
  coc_issued_at: null,
  with_coc: null,
  notes: null,
};

function ActivitiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "submitted">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "entry_no", desc: false }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["activities-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,entry_no,date_received,time_received,date_release_so,time_release_so,dts_ref,faculty_name,position,task_rendered,date_activity,institution,par_received_at,contribution,beneficiaries,coc_issued_at,with_coc,notes")
        .order("entry_no", { ascending: true, nullsFirst: false })
        .limit(5000);
      if (error) throw error;
      return data as Activity[];
    },
  });

  const markMutation = useMutation({
    mutationFn: async ({ id, submitted }: { id: string; submitted: boolean }) => {
      const { error } = await supabase
        .from("activities")
        .update({ par_received_at: submitted ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.submitted ? "Marked as submitted" : "Marked as pending");
      qc.invalidateQueries({ queryKey: ["activities-list"] });
      qc.invalidateQueries({ queryKey: ["activities-all"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ActivityFormValues }) => {
      const { error } = await supabase.from("activities").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activity updated");
      qc.invalidateQueries({ queryKey: ["activities-list"] });
      qc.invalidateQueries({ queryKey: ["activities-all"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const createMutation = useMutation({
    mutationFn: async (values: ActivityFormValues) => {
      const { error } = await supabase.from("activities").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activity created");
      qc.invalidateQueries({ queryKey: ["activities-list"] });
      qc.invalidateQueries({ queryKey: ["activities-all"] });
      setCreating(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  const rows = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "pending" && r.par_received_at) return false;
      if (status === "submitted" && !r.par_received_at) return false;
      if (!q) return true;
      return (
        r.faculty_name.toLowerCase().includes(q) ||
        (r.institution ?? "").toLowerCase().includes(q) ||
        (r.dts_ref ?? "").toLowerCase().includes(q) ||
        (r.position ?? "").toLowerCase().includes(q) ||
        (r.task_rendered ?? "").toLowerCase().includes(q) ||
        (r.contribution ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, status]);

  const columns = useMemo(() => {
    const c = createColumnHelper<Activity>();
    return [
      c.accessor("entry_no", { header: "No.", cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span> }),
      c.accessor("dts_ref", { header: "DTS No.", cell: (i) => <span className="text-xs font-mono">{i.getValue() ?? "—"}</span> }),
      c.accessor("faculty_name", { header: "Faculty", cell: (i) => <div className="font-medium">{i.getValue()}</div> }),
      c.accessor("contribution", {
        header: "Contribution to Core Functions",
        cell: (i) => {
          const v = i.getValue();
          if (!v) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[22rem] truncate text-xs text-muted-foreground" title={v}>{v}</span>
          );
        },
      }),
      c.accessor("position", { header: "Position", cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span> }),
      c.accessor("task_rendered", { header: "Task", cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span> }),
      c.accessor("institution", { header: "Institution", cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span> }),
      c.accessor("date_activity", { header: "Activity Date", cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span> }),
      c.accessor("date_received", { header: "Received", cell: (i) => <span className="text-xs">{fmtDate(i.getValue())}</span> }),
      c.accessor("beneficiaries", {
        header: "Beneficiaries",
        cell: (i) => {
          const v = i.getValue();
          if (!v) return <span className="text-xs text-muted-foreground">—</span>;
          return <span className="block max-w-[16rem] truncate text-xs" title={v}>{v}</span>;
        },
      }),
      c.accessor("coc_issued_at", {
        header: "COC Issued",
        cell: (i) => {
          const v = i.getValue();
          return v ? <span className="text-xs" title={fmtDateTime(v)}>{fmtDate(v)}</span> : <span className="text-xs text-muted-foreground">—</span>;
        },
      }),
      c.accessor("par_received_at", {
        header: "PAR Status",
        cell: (i) => {
          const v = i.getValue();
          return v ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/25 px-2 py-0.5 text-xs font-medium text-warning-foreground">
              <XCircle className="h-3 w-3" /> Pending
            </span>
          );
        },
      }),
      c.display({
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const submitted = !!row.original.par_received_at;
          return (
            <button
              disabled={markMutation.isPending}
              onClick={() => markMutation.mutate({ id: row.original.id, submitted: !submitted })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                submitted ? "border border-input hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {submitted ? "Undo" : "Mark submitted"}
            </button>
          );
        },
      }),
    ];
  }, [markMutation]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const [pageInput, setPageInput] = useState("1");
  const pageCount = table.getPageCount() || 1;
  useEffect(() => {
    setPageInput(String(table.getState().pagination.pageIndex + 1));
  }, [table.getState().pagination.pageIndex]);

  const goToPage = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n)) table.setPageIndex(Math.max(0, Math.min(n - 1, pageCount - 1)));
  };

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[100rem] space-y-4 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Activities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every faculty activity with its PAR submission status. Mark reports as received to keep the ledger accurate.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {rows.length}
          </span>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New activity
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty, institution, DTS, task…"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex rounded-md border border-input p-0.5">
          {(["all", "pending", "submitted"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="cursor-pointer px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={13} className="px-3 py-8 text-center text-sm text-muted-foreground">Loading activities…</td></tr>
              )}
              {!isLoading && table.getRowModel().rows.length === 0 && (
                <tr><td colSpan={13} className="px-3 py-8 text-center text-sm text-muted-foreground">No activities match your filters.</td></tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.original.id)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-2.5 align-top"
                      onClick={(e) => { if (cell.column.id === "actions") e.stopPropagation(); }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2 text-xs">
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="skip-page" className="text-muted-foreground">Skip to page</label>
            <input
              id="skip-page"
              type="number"
              min={1}
              max={pageCount}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") goToPage(); }}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={goToPage} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">Go</button>
          </div>
          <div className="flex gap-1">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-md border border-input p-1.5 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-md border border-input p-1.5 disabled:opacity-40">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <ActivityDetailModal
          activity={selected}
          onClose={() => setSelectedId(null)}
          onToggleSubmitted={(a) => markMutation.mutate({ id: a.id, submitted: !a.par_received_at })}
          onSave={(values) =>
            updateMutation.mutateAsync({ id: selected.id, values }).then(() => setSelectedId(null))
          }
          saving={updateMutation.isPending}
        />
      )}

      {creating && (
        <ActivityFormModal
          title="New activity"
          initial={EMPTY_FORM}
          onClose={() => setCreating(false)}
          onSave={(values) => createMutation.mutateAsync(values)}
          saving={createMutation.isPending}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-border/60 py-2 last:border-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function ActivityDetailModal({
  activity,
  onClose,
  onToggleSubmitted,
  onSave,
  saving,
}: {
  activity: Activity;
  onClose: () => void;
  onToggleSubmitted: (a: Activity) => void;
  onSave: (values: ActivityFormValues) => Promise<void>;
  saving: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitted = !!activity.par_received_at;

  if (editing) {
    const { id: _id, ...rest } = activity;
    return (
      <ActivityFormModal
        title={`Edit activity #${activity.entry_no ?? ""}`}
        initial={rest as ActivityFormValues}
        onClose={() => setEditing(false)}
        onSave={async (values) => { await onSave(values); setEditing(false); }}
        saving={saving}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Activity #{activity.entry_no ?? "—"} · {activity.dts_ref ?? "No DTS"}
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold">{activity.faculty_name}</h2>
            <div className="mt-1">
              {submitted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" /> PAR Submitted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/25 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                  <XCircle className="h-3 w-3" /> PAR Pending
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          <DetailRow label="Faculty" value={activity.faculty_name} />
          <DetailRow label="Position" value={activity.position} />
          <DetailRow label="DTS Ref" value={activity.dts_ref} />
          <DetailRow label="Task Rendered" value={activity.task_rendered} />
          <DetailRow label="Institution" value={activity.institution} />
          <DetailRow label="Activity Date" value={activity.date_activity} />
          <DetailRow label="Date Received" value={fmtDate(activity.date_received)} />
          <DetailRow label="Time Received" value={activity.time_received} />
          <DetailRow label="SO Release Date" value={fmtDate(activity.date_release_so)} />
          <DetailRow label="SO Release Time" value={activity.time_release_so} />
          <DetailRow label="Contribution" value={<span className="whitespace-pre-wrap">{activity.contribution}</span>} />
          <DetailRow label="Beneficiaries" value={<span className="whitespace-pre-wrap">{activity.beneficiaries}</span>} />
          <DetailRow label="With COC" value={activity.with_coc} />
          <DetailRow label="COC Issued" value={activity.coc_issued_at ? fmtDateTime(activity.coc_issued_at) : null} />
          <DetailRow label="PAR Received" value={activity.par_received_at ? fmtDateTime(activity.par_received_at) : null} />
          <DetailRow label="Notes" value={<span className="whitespace-pre-wrap">{activity.notes}</span>} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          {confirming ? (
            <>
              <span className="mr-2 text-sm text-muted-foreground">Mark this activity as submitted?</span>
              <button onClick={() => setConfirming(false)} className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted">Cancel</button>
              <button
                onClick={() => { setConfirming(false); onToggleSubmitted(activity); }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted">Close</button>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => submitted ? onToggleSubmitted(activity) : setConfirming(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  submitted ? "border border-input hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {submitted ? "Undo submission" : "Mark submitted"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label, children,
}: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function toDateInput(v: string | null): string {
  if (!v) return "";
  // Accept ISO or YYYY-MM-DD; slice date portion
  const d = v.length >= 10 ? v.slice(0, 10) : v;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function ActivityFormModal({
  title, initial, onClose, onSave, saving,
}: {
  title: string;
  initial: ActivityFormValues;
  onClose: () => void;
  onSave: (values: ActivityFormValues) => Promise<void>;
  saving: boolean;
}) {
  const [values, setValues] = useState<ActivityFormValues>(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof ActivityFormValues>(k: K, v: ActivityFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const nullable = (s: string): string | null => (s.trim() === "" ? null : s);

  const submit = async () => {
    if (!values.faculty_name.trim()) {
      toast.error("Faculty name is required");
      return;
    }
    try {
      await onSave(values);
    } catch {
      // toast handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Entry No.">
              <input
                type="number"
                className={inputCls}
                value={values.entry_no ?? ""}
                onChange={(e) => set("entry_no", e.target.value === "" ? null : Number(e.target.value))}
              />
            </FormField>
            <FormField label="DTS Ref">
              <input className={inputCls} value={values.dts_ref ?? ""} onChange={(e) => set("dts_ref", nullable(e.target.value))} />
            </FormField>
            <FormField label="Faculty Name *">
              <input className={inputCls} value={values.faculty_name} onChange={(e) => set("faculty_name", e.target.value)} />
            </FormField>
            <FormField label="Position">
              <input className={inputCls} value={values.position ?? ""} onChange={(e) => set("position", nullable(e.target.value))} />
            </FormField>
            <FormField label="Task Rendered">
              <input className={inputCls} value={values.task_rendered ?? ""} onChange={(e) => set("task_rendered", nullable(e.target.value))} />
            </FormField>
            <FormField label="Institution">
              <input className={inputCls} value={values.institution ?? ""} onChange={(e) => set("institution", nullable(e.target.value))} />
            </FormField>
            <FormField label="Activity Date (text)">
              <input className={inputCls} value={values.date_activity ?? ""} onChange={(e) => set("date_activity", nullable(e.target.value))} />
            </FormField>
            <FormField label="Date Received">
              <input type="date" className={inputCls} value={toDateInput(values.date_received)} onChange={(e) => set("date_received", nullable(e.target.value))} />
            </FormField>
            <FormField label="Time Received">
              <input className={inputCls} value={values.time_received ?? ""} onChange={(e) => set("time_received", nullable(e.target.value))} />
            </FormField>
            <FormField label="SO Release Date">
              <input type="date" className={inputCls} value={toDateInput(values.date_release_so)} onChange={(e) => set("date_release_so", nullable(e.target.value))} />
            </FormField>
            <FormField label="SO Release Time">
              <input className={inputCls} value={values.time_release_so ?? ""} onChange={(e) => set("time_release_so", nullable(e.target.value))} />
            </FormField>
            <FormField label="With COC">
              <input className={inputCls} value={values.with_coc ?? ""} onChange={(e) => set("with_coc", nullable(e.target.value))} />
            </FormField>
            <FormField label="COC Issued At">
              <input
                type="datetime-local"
                className={inputCls}
                value={values.coc_issued_at ? values.coc_issued_at.slice(0, 16) : ""}
                onChange={(e) => set("coc_issued_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </FormField>
            <FormField label="PAR Received At">
              <input
                type="datetime-local"
                className={inputCls}
                value={values.par_received_at ? values.par_received_at.slice(0, 16) : ""}
                onChange={(e) => set("par_received_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Contribution to Core Functions">
                <textarea rows={3} className={inputCls} value={values.contribution ?? ""} onChange={(e) => set("contribution", nullable(e.target.value))} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Beneficiaries">
                <textarea rows={2} className={inputCls} value={values.beneficiaries ?? ""} onChange={(e) => set("beneficiaries", nullable(e.target.value))} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Notes">
                <textarea rows={2} className={inputCls} value={values.notes ?? ""} onChange={(e) => set("notes", nullable(e.target.value))} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <button onClick={onClose} className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
