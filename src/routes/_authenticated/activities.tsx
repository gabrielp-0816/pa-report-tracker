import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
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
import {
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Pencil,
  Upload,
  Trash2,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Activities — TAAS 2025" }] }),
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
  scanned_report_url?: string | null;
  par_urls?: string[] | null;
  coc_urls?: string[] | null;
};

type ActivityFormValues = Omit<Activity, "id" | "par_received_at" | "coc_issued_at"> & {
  par_received_at: string | null;
  coc_issued_at: string | null;
  par_urls: string[];
  coc_urls: string[];
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
  scanned_report_url: null,
  par_urls: [],
  coc_urls: [],
};

function ActivitiesPage() {
  const qc = useQueryClient();
  const searchParams = useSearch({ strict: false });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "submitted">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "entry_no", desc: false }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (searchParams && typeof searchParams === "object" && "id" in searchParams) {
      const qId = (searchParams as any).id;
      if (qId && typeof qId === "string") {
        setSelectedId(qId);
      }
    }
  }, [searchParams]);

  const handleClose = () => {
    setSelectedId(null);
    navigate({ to: "/activities", search: {} as any });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["activities-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
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

  const nextEntryNo = useMemo(() => {
    if (rows.length === 0) return 1;
    const nums = rows.map((r) => r.entry_no).filter((n): n is number => typeof n === "number");
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }, [rows]);

  const initialFormValues = useMemo(() => {
    return {
      ...EMPTY_FORM,
      entry_no: nextEntryNo,
    };
  }, [nextEntryNo]);
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
      c.accessor("entry_no", {
        header: "No.",
        cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span>,
      }),
      c.accessor("dts_ref", {
        header: "DTS No.",
        cell: (i) => <span className="text-xs font-mono">{i.getValue() ?? "—"}</span>,
      }),
      c.accessor("faculty_name", {
        header: "Faculty",
        cell: (i) => <div className="font-medium">{i.getValue()}</div>,
      }),
      c.accessor("contribution", {
        header: "Contribution to Core Functions",
        cell: (i) => {
          const v = i.getValue();
          if (!v) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[22rem] truncate text-xs text-muted-foreground" title={v}>
              {v}
            </span>
          );
        },
      }),
      c.accessor("position", {
        header: "Position",
        cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span>,
      }),
      c.accessor("task_rendered", {
        header: "Task",
        cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span>,
      }),
      c.accessor("institution", {
        header: "Institution",
        cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span>,
      }),
      c.accessor("date_activity", {
        header: "Activity Date",
        cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span>,
      }),
      c.accessor("date_received", {
        header: "Received",
        cell: (i) => <span className="text-xs">{fmtDate(i.getValue())}</span>,
      }),
      c.accessor("beneficiaries", {
        header: "Beneficiaries",
        cell: (i) => {
          const v = i.getValue();
          if (!v) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[16rem] truncate text-xs" title={v}>
              {v}
            </span>
          );
        },
      }),
      c.accessor("coc_issued_at", {
        header: "COC Issued",
        cell: (i) => {
          const v = i.getValue();
          return v ? (
            <span className="text-xs" title={fmtDateTime(v)}>
              {fmtDate(v)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
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
              onClick={() => {
                const message = submitted
                  ? "Are you sure you want to undo submission for this activity?"
                  : "Are you sure you want to mark this activity as submitted?";
                if (window.confirm(message)) {
                  markMutation.mutate({ id: row.original.id, submitted: !submitted });
                }
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${submitted
                  ? "border border-input hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:opacity-90"
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
            Every faculty activity with its PAR submission status. Mark reports as received to keep
            the ledger accurate.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            {rows.length}
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
              className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${status === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
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
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Loading activities…
                  </td>
                </tr>
              )}
              {!isLoading && table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No activities match your filters.
                  </td>
                </tr>
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
                      onClick={(e) => {
                        if (cell.column.id === "actions") e.stopPropagation();
                      }}
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
            <label htmlFor="skip-page" className="text-muted-foreground">
              Skip to page
            </label>
            <input
              id="skip-page"
              type="number"
              min={1}
              max={pageCount}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToPage();
              }}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={goToPage}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Go
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-md border border-input p-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-md border border-input p-1.5 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <ActivityDetailModal
          activity={selected}
          onClose={handleClose}
          onToggleSubmitted={(a) =>
            markMutation.mutate({ id: a.id, submitted: !a.par_received_at })
          }
          onSave={(values) =>
            updateMutation.mutateAsync({ id: selected.id, values }).then(() => handleClose())
          }
          saving={updateMutation.isPending}
        />
      )}

      {creating && (
        <ActivityFormModal
          title="New activity"
          initial={initialFormValues}
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
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
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

  const parFiles = useMemo(() => {
    if (activity.par_urls && activity.par_urls.length > 0) return activity.par_urls;
    return activity.scanned_report_url ? [activity.scanned_report_url] : [];
  }, [activity]);

  const cocFiles = useMemo(() => {
    return activity.coc_urls ?? [];
  }, [activity]);

  const [activeTab, setActiveTab] = useState<"par" | "coc">(parFiles.length > 0 ? "par" : "coc");
  const [parIdx, setParIdx] = useState(0);
  const [cocIdx, setCocIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitted = !!activity.par_received_at;

  if (editing) {
    const { id: _id, ...rest } = activity;
    return (
      <ActivityFormModal
        title={`Edit activity #${activity.entry_no ?? ""}`}
        initial={{
          ...rest,
          par_urls: parFiles,
          coc_urls: cocFiles,
        } as ActivityFormValues}
        onClose={() => setEditing(false)}
        onSave={async (values) => {
          await onSave(values);
          setEditing(false);
        }}
        saving={saving}
      />
    );
  }

  const activeFiles = activeTab === "par" ? parFiles : cocFiles;
  const activeIdx = activeTab === "par" ? parIdx : cocIdx;
  const activeUrl = activeFiles[activeIdx] ?? null;
  const isPdf = activeUrl?.toLowerCase().endsWith(".pdf");
  const hasAttachments = parFiles.length > 0 || cocFiles.length > 0;

  const detailsList = (
    <div className="space-y-0">
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
      <DetailRow
        label="Contribution"
        value={<span className="whitespace-pre-wrap">{activity.contribution}</span>}
      />
      <DetailRow
        label="Beneficiaries"
        value={<span className="whitespace-pre-wrap">{activity.beneficiaries}</span>}
      />
      <DetailRow label="With COC" value={activity.with_coc} />
      <DetailRow
        label="COC Issued"
        value={activity.coc_issued_at ? fmtDateTime(activity.coc_issued_at) : null}
      />
      <DetailRow
        label="PAR Received"
        value={activity.par_received_at ? fmtDateTime(activity.par_received_at) : null}
      />
      <DetailRow
        label="Notes"
        value={<span className="whitespace-pre-wrap">{activity.notes}</span>}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${
          hasAttachments ? "max-w-6xl" : "max-w-2xl"
        } overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Activity #{activity.entry_no ?? "—"} · {activity.dts_ref ?? "No DTS"}
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold">{activity.faculty_name}</h2>
            <div className="mt-1 flex items-center gap-2">
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
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasAttachments ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
            <div className="col-span-1 md:col-span-5 overflow-y-auto px-6 py-4 border-r border-border/60">
              {detailsList}
            </div>
            <div className="col-span-1 md:col-span-7 flex flex-col overflow-hidden bg-muted/20">
              {/* Tabs header */}
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 shrink-0">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setActiveTab("par");
                      setParIdx(0);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === "par"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    PAR Files ({parFiles.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("coc");
                      setCocIdx(0);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === "coc"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    COC Files ({cocFiles.length})
                  </button>
                </div>
                {activeUrl && (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open original <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Document preview container */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[320px]">
                {!activeUrl ? (
                  <div className="text-center text-xs text-muted-foreground py-12">
                    No files attached in this category ({activeTab.toUpperCase()}).
                  </div>
                ) : isPdf ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center max-w-md shadow-sm">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">PDF Document Attached</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeTab.toUpperCase()} File #{activeIdx + 1}
                      </p>
                    </div>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all shadow-sm"
                    >
                      Open PDF Document <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="group relative flex h-full w-full max-h-[60vh] items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm">
                    <img
                      src={activeUrl}
                      alt={`${activeTab.toUpperCase()} Attachment ${activeIdx + 1}`}
                      className="max-h-[55vh] max-w-full rounded-lg object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={activeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <ExternalLink className="h-4 w-4" /> Open Full Image
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail selector strip if multiple files exist in category */}
              {activeFiles.length > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-border bg-card p-3 overflow-x-auto shrink-0">
                  {activeFiles.map((url, i) => {
                    const isSelected = i === activeIdx;
                    const itemIsPdf = url.toLowerCase().endsWith(".pdf");
                    return (
                      <button
                        key={url + i}
                        onClick={() => {
                          if (activeTab === "par") setParIdx(i);
                          else setCocIdx(i);
                        }}
                        className={`relative h-12 w-12 rounded-lg border-2 overflow-hidden transition-all shrink-0 ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 scale-105"
                            : "border-border opacity-70 hover:opacity-100"
                        }`}
                      >
                        {itemIsPdf ? (
                          <div className="h-full w-full grid place-items-center bg-red-50 text-red-600 text-[10px] font-bold">
                            PDF #{i + 1}
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Thumb ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">{detailsList}</div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3 shrink-0">
          {confirming ? (
            <>
              <span className="mr-2 text-sm text-muted-foreground">
                {submitted
                  ? "Undo submission for this activity?"
                  : "Mark this activity as submitted?"}
              </span>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onToggleSubmitted(activity);
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => setConfirming(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  submitted
                    ? "border border-input hover:bg-muted"
                    : "bg-primary text-primary-foreground hover:opacity-90"
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

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function toDateInput(v: string | null): string {
  if (!v) return "";
  // Accept ISO or YYYY-MM-DD; slice date portion
  const d = v.length >= 10 ? v.slice(0, 10) : v;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}

function toDateTimeLocalInput(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    return v.length >= 16 ? v.slice(0, 16) : v;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocalInput(v: string | null | undefined): string | null {
  if (!v || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString();
}

function ActivityFormModal({
  title,
  initial,
  onClose,
  onSave,
  saving,
}: {
  title: string;
  initial: ActivityFormValues;
  onClose: () => void;
  onSave: (values: ActivityFormValues) => Promise<void>;
  saving: boolean;
}) {
  const [values, setValues] = useState<ActivityFormValues>({
    ...initial,
    par_urls: initial.par_urls ?? (initial.scanned_report_url ? [initial.scanned_report_url] : []),
    coc_urls: initial.coc_urls ?? [],
  });
  const [uploadingType, setUploadingType] = useState<"par" | "coc" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof ActivityFormValues>(k: K, v: ActivityFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const nullable = (s: string): string | null => (s.trim() === "" ? null : s);

  const handleMultipleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "par" | "coc"
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Some files are unsupported. Please upload images (JPEG, PNG, WEBP) or PDFs.");
      return;
    }

    const oversizedFiles = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("File size must be under 5MB per file.");
      return;
    }

    try {
      setUploadingType(type);
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${type}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("scanned-reports")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("scanned-reports")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      if (type === "par") {
        setValues((prev) => ({
          ...prev,
          par_urls: [...prev.par_urls, ...uploadedUrls],
          // Maintain legacy fallback to first item
          scanned_report_url: prev.scanned_report_url ?? uploadedUrls[0],
          // Automatically mark as submitted if not already set
          par_received_at: prev.par_received_at || new Date().toISOString(),
        }));
        toast.success(`Uploaded ${uploadedUrls.length} PAR attachment(s)!`);
      } else {
        setValues((prev) => ({
          ...prev,
          coc_urls: [...prev.coc_urls, ...uploadedUrls],
          with_coc: "YES",
        }));
        toast.success(`Uploaded ${uploadedUrls.length} COC attachment(s)!`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to upload file(s)");
    } finally {
      setUploadingType(null);
      e.target.value = "";
    }
  };

  const removeFile = (type: "par" | "coc", indexToRemove: number) => {
    if (type === "par") {
      setValues((prev) => {
        const newPar = prev.par_urls.filter((_, idx) => idx !== indexToRemove);
        return {
          ...prev,
          par_urls: newPar,
          scanned_report_url: newPar[0] ?? null,
        };
      });
    } else {
      setValues((prev) => ({
        ...prev,
        coc_urls: prev.coc_urls.filter((_, idx) => idx !== indexToRemove),
      }));
    }
  };

  const submit = async () => {
    if (!values.faculty_name.trim()) {
      toast.error("Faculty name is required");
      return;
    }
    try {
      const formattedValues: ActivityFormValues = {
        ...values,
        coc_issued_at: fromDateTimeLocalInput(values.coc_issued_at),
        par_received_at: fromDateTimeLocalInput(values.par_received_at),
      };
      await onSave(formattedValues);
    } catch {
      // toast handled by mutation
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Entry No.">
              <input
                type="number"
                className={inputCls}
                value={values.entry_no ?? ""}
                onChange={(e) =>
                  set("entry_no", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </FormField>
            <FormField label="DTS Ref">
              <input
                className={inputCls}
                value={values.dts_ref ?? ""}
                onChange={(e) => set("dts_ref", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="Faculty Name *">
              <input
                className={inputCls}
                value={values.faculty_name}
                onChange={(e) => set("faculty_name", e.target.value)}
              />
            </FormField>
            <FormField label="Position">
              <input
                className={inputCls}
                value={values.position ?? ""}
                onChange={(e) => set("position", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="Task Rendered">
              <input
                className={inputCls}
                value={values.task_rendered ?? ""}
                onChange={(e) => set("task_rendered", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="Institution">
              <input
                className={inputCls}
                value={values.institution ?? ""}
                onChange={(e) => set("institution", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="Activity Date (text)">
              <input
                className={inputCls}
                value={values.date_activity ?? ""}
                onChange={(e) => set("date_activity", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="Date Received">
              <input
                type="date"
                className={inputCls}
                value={toDateInput(values.date_received)}
                onChange={(e) => set("date_received", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="Time Received">
              <input
                className={inputCls}
                value={values.time_received ?? ""}
                onChange={(e) => set("time_received", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="SO Release Date">
              <input
                type="date"
                className={inputCls}
                value={toDateInput(values.date_release_so)}
                onChange={(e) => set("date_release_so", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="SO Release Time">
              <input
                className={inputCls}
                value={values.time_release_so ?? ""}
                onChange={(e) => set("time_release_so", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="With COC">
              <input
                className={inputCls}
                value={values.with_coc ?? ""}
                onChange={(e) => set("with_coc", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="COC Issued At">
              <input
                type="datetime-local"
                className={inputCls}
                value={toDateTimeLocalInput(values.coc_issued_at)}
                onChange={(e) => set("coc_issued_at", nullable(e.target.value))}
              />
            </FormField>
            <FormField label="PAR Received At">
              <input
                type="datetime-local"
                className={inputCls}
                value={toDateTimeLocalInput(values.par_received_at)}
                onChange={(e) => set("par_received_at", nullable(e.target.value))}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Contribution to Core Functions">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={values.contribution ?? ""}
                  onChange={(e) => set("contribution", nullable(e.target.value))}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Beneficiaries">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={values.beneficiaries ?? ""}
                  onChange={(e) => set("beneficiaries", nullable(e.target.value))}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Notes">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={values.notes ?? ""}
                  onChange={(e) => set("notes", nullable(e.target.value))}
                />
              </FormField>
            </div>

            {/* PAR File Attachments Section */}
            <div className="sm:col-span-2 space-y-1 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  PAR Attachments (Post-Activity Report Copies)
                </span>
                <span className="text-xs text-muted-foreground">
                  {values.par_urls.length} file(s) attached
                </span>
              </div>
              <div className="rounded-lg border border-dashed border-input bg-muted/20 p-4 space-y-3">
                {values.par_urls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {values.par_urls.map((url, index) => {
                      const isPdf = url.toLowerCase().endsWith(".pdf");
                      return (
                        <div
                          key={url + index}
                          className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 shadow-sm min-w-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPdf ? (
                              <div className="grid h-10 w-10 place-items-center rounded bg-red-50 text-red-600 shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`PAR ${index + 1}`}
                                className="h-10 w-10 rounded object-cover border border-border shrink-0 bg-muted"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                PAR File #{index + 1}
                              </p>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile("par", index)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <input
                    type="file"
                    id="par-upload-input"
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleMultipleUpload(e, "par")}
                    disabled={uploadingType !== null}
                  />
                  <label
                    htmlFor="par-upload-input"
                    className={`inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer ${
                      uploadingType !== null ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {uploadingType === "par" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading PAR File(s)...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Add PAR File(s)
                      </>
                    )}
                  </label>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Upload 1 or more images (JPEG, PNG, WEBP) or PDFs (max 5MB each)
                  </p>
                </div>
              </div>
            </div>

            {/* COC File Attachments Section */}
            <div className="sm:col-span-2 space-y-1 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  COC Attachments (Certificate of Compliance Copies)
                </span>
                <span className="text-xs text-muted-foreground">
                  {values.coc_urls.length} file(s) attached
                </span>
              </div>
              <div className="rounded-lg border border-dashed border-input bg-muted/20 p-4 space-y-3">
                {values.coc_urls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {values.coc_urls.map((url, index) => {
                      const isPdf = url.toLowerCase().endsWith(".pdf");
                      return (
                        <div
                          key={url + index}
                          className="flex items-center justify-between gap-2 rounded-md border border-border bg-card p-2 shadow-sm min-w-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPdf ? (
                              <div className="grid h-10 w-10 place-items-center rounded bg-red-50 text-red-600 shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                            ) : (
                              <img
                                src={url}
                                alt={`COC ${index + 1}`}
                                className="h-10 w-10 rounded object-cover border border-border shrink-0 bg-muted"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                COC File #{index + 1}
                              </p>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile("coc", index)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <input
                    type="file"
                    id="coc-upload-input"
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleMultipleUpload(e, "coc")}
                    disabled={uploadingType !== null}
                  />
                  <label
                    htmlFor="coc-upload-input"
                    className={`inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer ${
                      uploadingType !== null ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {uploadingType === "coc" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading COC File(s)...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Add COC File(s)
                      </>
                    )}
                  </label>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Upload 1 or more images (JPEG, PNG, WEBP) or PDFs (max 5MB each)
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || uploadingType !== null}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
