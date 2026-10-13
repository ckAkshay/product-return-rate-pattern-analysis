/**
 * Formatting and display helper utilities for the analytics dashboard.
 */

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return new Intl.NumberFormat("en-US").format(Math.round(val));
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "Undefined";
  return `${Number(val).toFixed(2)}%`;
}

export function getStatusStyle(status: string): {
  label: string;
  badgeClass: string;
  isHigh: boolean;
} {
  const norm = (status || "").trim().toUpperCase();
  if (norm === "HIGH RETURNS") {
    return {
      label: "HIGH RETURNS",
      badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      isHigh: true,
    };
  }
  if (norm === "UNDEFINED") {
    return {
      label: "Undefined",
      badgeClass: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
      isHigh: false,
    };
  }
  return {
    label: "NORMAL",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    isHigh: false,
  };
}
