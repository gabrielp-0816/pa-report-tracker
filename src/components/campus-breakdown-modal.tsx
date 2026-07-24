import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Search,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Layers,
} from "lucide-react";

export type CampusSummaryItem = {
  name: string;
  pending: number;
  submitted: number;
  total: number;
  rate: number;
};

interface CampusBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campusData: CampusSummaryItem[];
}

type SortField = "pending" | "submitted" | "total" | "rate" | "name";

export function CampusBreakdownModal({
  open,
  onOpenChange,
  campusData,
}: CampusBreakdownModalProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("pending");
  const [sortDesc, setSortDesc] = useState(true);

  // Totals
  const overall = useMemo(() => {
    const totalPending = campusData.reduce((acc, c) => acc + c.pending, 0);
    const totalSubmitted = campusData.reduce((acc, c) => acc + c.submitted, 0);
    const totalAll = totalPending + totalSubmitted;
    const overallRate = totalAll > 0 ? Math.round((totalSubmitted / totalAll) * 100) : 0;
    return {
      campusCount: campusData.length,
      pending: totalPending,
      submitted: totalSubmitted,
      total: totalAll,
      rate: overallRate,
    };
  }, [campusData]);

  // Filtered and Sorted list
  const processedList = useMemo(() => {
    let list = [...campusData];

    // Filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a[sortField] - b[sortField];
      }
      return sortDesc ? -cmp : cmp;
    });

    return list;
  }, [campusData, search, sortField, sortDesc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            <DialogTitle className="font-display text-xl font-semibold">
              Post-Activity Report Summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Complete breakdown of Post-Activity Reports (PAR) by campus and college unit.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary Banner */}
        <div className="bg-muted/40 border-b border-border px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-card p-2.5 rounded-lg border border-border">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Layers className="h-3.5 w-3.5 text-primary" /> Total Units
            </span>
            <p className="font-display text-lg font-bold mt-0.5 text-foreground">
              {overall.campusCount}
            </p>
          </div>
          <div className="bg-card p-2.5 rounded-lg border border-border">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock className="h-3.5 w-3.5 text-warning-foreground" /> Total Pending
            </span>
            <p className="font-display text-lg font-bold mt-0.5 text-warning-foreground">
              {overall.pending}
            </p>
          </div>
          <div className="bg-card p-2.5 rounded-lg border border-border">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Total Submitted
            </span>
            <p className="font-display text-lg font-bold mt-0.5 text-success">
              {overall.submitted}
            </p>
          </div>
          <div className="bg-card p-2.5 rounded-lg border border-border">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <TrendingUp className="h-3.5 w-3.5 text-accent-foreground" /> Overall Rate
            </span>
            <p className="font-display text-lg font-bold mt-0.5 text-foreground">
              {overall.rate}%
            </p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by campus or college unit..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Sort by:</span>
            <Button
              type="button"
              variant={sortField === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("pending")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              Pending {sortField === "pending" && <ArrowUpDown className="h-3 w-3" />}
            </Button>
            <Button
              type="button"
              variant={sortField === "submitted" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("submitted")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              Submitted {sortField === "submitted" && <ArrowUpDown className="h-3 w-3" />}
            </Button>
            <Button
              type="button"
              variant={sortField === "rate" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("rate")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              Rate % {sortField === "rate" && <ArrowUpDown className="h-3 w-3" />}
            </Button>
            <Button
              type="button"
              variant={sortField === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("name")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              Name {sortField === "name" && <ArrowUpDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px] space-y-3">
          {processedList.length === 0 ? (
            <p className="p-12 text-center text-xs text-muted-foreground">
              No campus or unit matching "{search}".
            </p>
          ) : (
            processedList.map((item, index) => {
              const pendingPct = item.total > 0 ? (item.pending / item.total) * 100 : 0;
              const submittedPct = item.total > 0 ? (item.submitted / item.total) * 100 : 0;

              return (
                <div
                  key={item.name}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-display text-[11px] font-semibold text-muted-foreground mt-0.5">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display font-semibold text-sm text-foreground truncate">
                          {item.name}
                        </p>
                        <Badge
                          variant={item.pending > 0 ? "secondary" : "outline"}
                          className={`text-[10px] ${
                            item.pending > 0
                              ? "bg-warning/20 text-warning-foreground hover:bg-warning/30 border-warning/30"
                              : "text-success border-success/30"
                          }`}
                        >
                          {item.pending} pending
                        </Badge>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-success transition-all"
                          style={{ width: `${submittedPct}%` }}
                          title={`Submitted: ${item.submitted} (${Math.round(submittedPct)}%)`}
                        />
                        <div
                          className="bg-warning transition-all"
                          style={{ width: `${pendingPct}%` }}
                          title={`Pending: ${item.pending} (${Math.round(pendingPct)}%)`}
                        />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="text-success font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {item.submitted} Submitted
                        </span>
                        <span className="text-warning-foreground font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.pending} Pending
                        </span>
                        <span>Total: {item.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Rate & Action */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-muted-foreground">Compliance</span>
                      <p className="font-display font-bold text-sm text-foreground">
                        {item.rate}%
                      </p>
                    </div>

                    <Link
                      to="/activities"
                      onClick={() => onOpenChange(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      View Activities <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {processedList.length} of {campusData.length} campuses/units
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 px-4"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
