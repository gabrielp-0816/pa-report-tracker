import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Search, Pencil, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/faculty")({
  head: () => ({ meta: [{ title: "Faculty — FPARTS" }] }),
  component: FacultyPage,
});

type Contact = { faculty_name: string; email: string | null; phone: string | null; department: string | null };
type ActivityRollup = { faculty_name: string; total: number; submitted: number; pending: number };

function FacultyPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; phone: string }>({ email: "", phone: "" });

  const { data: contacts } = useQuery({
    queryKey: ["faculty-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculty_contacts").select("*").order("faculty_name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const { data: rollup } = useQuery({
    queryKey: ["faculty-rollup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("faculty_name,par_received_at").limit(5000);
      if (error) throw error;
      const map = new Map<string, ActivityRollup>();
      for (const r of data ?? []) {
        const name = (r as { faculty_name: string; par_received_at: string | null }).faculty_name;
        if (!map.has(name)) map.set(name, { faculty_name: name, total: 0, submitted: 0, pending: 0 });
        const b = map.get(name)!;
        b.total++;
        if ((r as { par_received_at: string | null }).par_received_at) b.submitted++;
        else b.pending++;
      }
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async ({ name, email, phone }: { name: string; email: string; phone: string }) => {
      const { error } = await supabase.from("faculty_contacts").update({
        email: email || null,
        phone: phone || null,
      }).eq("faculty_name", name);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["faculty-contacts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = contacts ?? [];
    if (!q) return list;
    return list.filter((c) =>
      c.faculty_name.toLowerCase().includes(q) ||
      (c.department ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const PAGE_SIZE = 15;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => { setPageIndex(0); }, [search, filtered.length]);
  useEffect(() => { setPageInput(String(pageIndex + 1)); }, [pageIndex]);

  const paginated = useMemo(
    () => filtered.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE),
    [filtered, pageIndex],
  );

  const goToPage = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n)) setPageIndex(Math.max(0, Math.min(n - 1, pageCount - 1)));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-6 py-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Faculty directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {contacts?.length ?? 0} faculty on record. Add contact emails so you can send them PAR reminders.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, department, or email"
          className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Faculty</th>
                <th className="px-4 py-2.5">Department / Campus</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Activities</th>
                <th className="px-4 py-2.5">Pending</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => {
                const r = rollup?.get(c.faculty_name);
                const isEditing = editing === c.faculty_name;
                return (
                  <tr key={c.faculty_name} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium">{c.faculty_name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.department ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded border border-input bg-background px-2 py-1 text-xs" placeholder="name@school.edu" />
                      ) : (
                        <span className="text-xs">{c.email ?? <span className="text-muted-foreground">Not set</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded border border-input bg-background px-2 py-1 text-xs" />
                      ) : (
                        <span className="text-xs">{c.phone ?? <span className="text-muted-foreground">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{r?.total ?? 0}</td>
                    <td className="px-4 py-2.5">
                      {r?.pending ? (
                        <span className="rounded-full bg-warning/25 px-2 py-0.5 text-xs font-medium text-warning-foreground">{r.pending}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => save.mutate({ name: c.faculty_name, email: form.email, phone: form.phone })} className="rounded-md bg-primary p-1.5 text-primary-foreground"><Save className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEditing(null)} className="rounded-md border border-input p-1.5"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditing(c.faculty_name); setForm({ email: c.email ?? "", phone: c.phone ?? "" }); }}
                          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-muted"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2 text-xs">
            <span className="text-muted-foreground">
              Page {pageIndex + 1} of {pageCount} ({filtered.length} faculty)
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="faculty-skip-page" className="text-muted-foreground">Skip to page</label>
              <input
                id="faculty-skip-page"
                type="number"
                min={1}
                max={pageCount}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") goToPage(); }}
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
    </div>
  );
}
