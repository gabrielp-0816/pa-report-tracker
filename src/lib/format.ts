export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysBetween(a: string | null | undefined, b: Date = new Date()): number | null {
  if (!a) return null;
  const d = new Date(a);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((b.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
