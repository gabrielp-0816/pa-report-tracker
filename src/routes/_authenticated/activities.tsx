import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
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
import { CheckCircle2, XCircle, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Activities — FPARTS" }] }),
  component: ActivitiesPage,
});

type Activity = {
  id: string;
  entry_no: number | null;
  date_received: string | null;
  dts_ref: string | null;
  faculty_name: string;
  position: string | null;
  task_rendered: string | null;
  date_activity: string | null;
  institution: string | null;
  par_received_at: string | null;
};

function ActivitiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "submitted">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "date_received", desc: true }]);

  const { data, isLoading } = useQuery({
    queryKey: ["activities-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,entry_no,date_received,dts_ref,faculty_name,position,task_rendered,date_activity,institution,par_received_at")
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
        (r.task_rendered ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, status]);

  const columns = useMemo(() => {
    const c = createColumnHelper<Activity>();
    return [
      c.accessor("entry_no", { header: "No.", cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span> }),
      c.accessor("faculty_name", { header: "Faculty", cell: (i) => <div className="font-medium">{i.getValue()}</div> }),
      c.accessor("position", { header: "Position", cell: (i) => <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span> }),
      c.accessor("task_rendered", { header: "Task", cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span> }),
      c.accessor("institution", { header: "Institution", cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span> }),
      c.accessor("date_activity", { header: "Activity Date", cell: (i) => <span className="text-xs">{i.getValue() ?? "—"}</span> }),
      c.accessor("date_received", { header: "Received", cell: (i) => <span className="text-xs">{fmtDate(i.getValue())}</span> }),
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
                submitted
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
                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">Loading activities…</td></tr>
              )}
              {!isLoading && table.getRowModel().rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">No activities match your filters.</td></tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-top">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs">
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
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
    </div>
  );
}
