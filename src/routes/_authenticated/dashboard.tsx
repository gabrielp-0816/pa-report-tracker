import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, ClipboardList, Clock, TrendingUp, ArrowRight, Mail } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { fmtDate } from "@/lib/format";
import { normalizeCampusName } from "@/lib/campus-utils";
import { CampusBreakdownModal, CampusSummaryItem } from "@/components/campus-breakdown-modal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TAAS 2025" }] }),
  component: Dashboard,
});

type Activity = {
  id: string;
  faculty_name: string;
  institution: string | null;
  date_received: string | null;
  par_received_at: string | null;
  position: string | null;
  task_rendered: string | null;
};

function Dashboard() {
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["activities-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,faculty_name,institution,date_received,par_received_at,position,task_rendered")
        .order("date_received", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data as Activity[];
    },
  });

  const rows = data ?? [];
  const total = rows.length;
  const submitted = rows.filter((r) => r.par_received_at).length;
  const pending = total - submitted;
  const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  // Monthly submission trend
  const byMonth = new Map<string, { month: string; submitted: number; pending: number }>();
  for (const r of rows) {
    const dt = r.date_received ? new Date(r.date_received) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, { month: key, submitted: 0, pending: 0 });
    const bucket = byMonth.get(key)!;
    if (r.par_received_at) bucket.submitted++;
    else bucket.pending++;
  }
  const monthly = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));

  // Top campuses by pending (normalized & merged to prevent duplication)
  const allCampusesSorted: CampusSummaryItem[] = useMemo(() => {
    const byCampus = new Map<
      string,
      { name: string; pending: number; submitted: number; total: number; rate: number }
    >();

    for (const r of rows) {
      const rawCampus = r.position || r.institution || "Unassigned";
      const c = normalizeCampusName(rawCampus);
      if (!byCampus.has(c)) {
        byCampus.set(c, { name: c, pending: 0, submitted: 0, total: 0, rate: 0 });
      }
      const b = byCampus.get(c)!;
      b.total++;
      if (r.par_received_at) b.submitted++;
      else b.pending++;
    }

    return Array.from(byCampus.values())
      .map((c) => ({
        ...c,
        rate: c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.pending - a.pending);
  }, [rows]);

  const topCampuses = useMemo(() => allCampusesSorted.slice(0, 6), [allCampusesSorted]);

  const statusPie = [
    { name: "Submitted", value: submitted, fill: "var(--color-success)" },
    { name: "Pending", value: pending, fill: "var(--color-warning)" },
  ];

  const recentPending = rows.filter((r) => !r.par_received_at).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of Post-Activity Report submissions across your institution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total activities" value={total} tone="primary" />
        <StatCard icon={ClipboardCheck} label="PARs submitted" value={submitted} tone="success" />
        <StatCard icon={Clock} label="Pending PARs" value={pending} tone="warning" />
        <StatCard icon={TrendingUp} label="Submission rate" value={`${rate}%`} tone="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold">Submissions by month</h3>
          <p className="text-xs text-muted-foreground">
            Activities received per month, broken down by PAR status.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                />
                <Legend />
                <Bar
                  dataKey="submitted"
                  stackId="a"
                  name="Submitted"
                  fill="var(--color-success)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="pending"
                  stackId="a"
                  name="Pending"
                  fill="var(--color-warning)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold">Status distribution</h3>
          <p className="text-xs text-muted-foreground">All-time PAR status.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {statusPie.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Top campuses / units by pending PARs</h3>
            <button
              type="button"
              onClick={() => setBreakdownModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={topCampuses} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={160} />
                <Tooltip />
                <Bar
                  dataKey="pending"
                  name="Pending"
                  fill="var(--color-warning)"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="submitted"
                  name="Submitted"
                  fill="var(--color-success)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Recent pending PARs</h3>
            <div className="flex items-center gap-3">
              <Link
                to="/reminders"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" /> Bulk Email Reminders
              </Link>
              <Link
                to="/activities"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="mt-3 divide-y divide-border">
            {isLoading && <p className="py-6 text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && recentPending.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No pending PARs. 🎉</p>
            )}
            {recentPending.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.faculty_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.task_rendered ?? "—"} · {r.institution ?? "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="text-xs font-medium">{fmtDate(r.date_received)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CampusBreakdownModal
        open={breakdownModalOpen}
        onOpenChange={setBreakdownModalOpen}
        campusData={allCampusesSorted}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: "primary" | "success" | "warning" | "accent";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    accent: "bg-accent/20 text-accent-foreground",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`grid h-9 w-9 place-items-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
