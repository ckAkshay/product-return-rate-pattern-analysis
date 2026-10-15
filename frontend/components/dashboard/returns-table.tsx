"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { ReturnRecord } from "@/lib/types";
import { formatNumber, formatPercent, getStatusStyle } from "@/lib/formatters";

interface ReturnsTableProps {
  records: ReturnRecord[];
  loading: boolean;
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onOpenAddModal?: () => void;
}

export function CategoryReturnsTable({
  records,
  loading,
  totalRecords,
  currentPage,
  pageSize,
  onPageChange,
  onOpenAddModal,
}: ReturnsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Client-side search filtering if applied
  const filteredRecords = React.useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(
      (r) =>
        r.category.toLowerCase().includes(term) ||
        r.week.toLowerCase().includes(term) ||
        r.status.toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  // Export current records to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ["Week", "Category", "Units Sold", "Units Returned", "Return Rate (%)", "Status"];
    const rows = filteredRecords.map((r) => [
      r.week,
      `"${r.category}"`,
      r.total_sold,
      r.total_returned,
      r.return_rate,
      `"${r.status}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `return_rates_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden mb-8">
      <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              Category-Wise Weekly Results
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Interactive Table
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full audit log of MapReduce aggregated return metrics & live simulated batches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search category/week..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 pl-8 rounded-xl bg-slate-950/70 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 sm:w-52 transition-all"
            />
            <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            title="Download records as CSV"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          {/* Add Record Button */}
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 active:scale-95 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              <span>+</span>
              <span>Add Record</span>
            </button>
          )}

          <div className="text-xs text-slate-400 hidden lg:block ml-2 border-l border-white/10 pl-3">
            Showing <strong>{filteredRecords.length}</strong> of <strong>{totalRecords}</strong>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-5">Week</th>
              <th className="py-3.5 px-5">Product Category</th>
              <th className="py-3.5 px-5 text-right">Units Sold</th>
              <th className="py-3.5 px-5 text-right">Units Returned</th>
              <th className="py-3.5 px-5">Return Rate</th>
              <th className="py-3.5 px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-slate-200">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-5"><div className="h-4 w-16 bg-white/10 rounded" /></td>
                  <td className="py-4 px-5"><div className="h-4 w-24 bg-white/10 rounded" /></td>
                  <td className="py-4 px-5 text-right"><div className="h-4 w-12 bg-white/10 rounded ml-auto" /></td>
                  <td className="py-4 px-5 text-right"><div className="h-4 w-12 bg-white/10 rounded ml-auto" /></td>
                  <td className="py-4 px-5"><div className="h-4 w-16 bg-white/10 rounded" /></td>
                  <td className="py-4 px-5"><div className="h-4 w-20 bg-white/10 rounded" /></td>
                </tr>
              ))
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-slate-600" />
                    <p className="font-semibold text-slate-300">No records found</p>
                    <p className="text-xs text-slate-500">
                      Try adjusting your search or resetting your filter criteria.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => {
                const statusInfo = getStatusStyle(r.status);
                const rateNum = r.return_rate ?? 0;
                const progressWidth = Math.min(100, (rateNum / 35) * 100);

                return (
                  <tr
                    key={`${r.week}-${r.category}-${idx}`}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono text-slate-300 font-semibold">
                      {r.week}
                    </td>
                    <td className="py-3.5 px-5 font-medium text-white">
                      {r.category}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono">
                      {formatNumber(r.total_sold)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono">
                      {formatNumber(r.total_returned)}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-bold w-14 ${
                            statusInfo.isHigh ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {formatPercent(r.return_rate)}
                        </span>
                        <div className="hidden sm:block h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              statusInfo.isHigh ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            statusInfo.isHigh ? "bg-rose-400" : "bg-emerald-400"
                          }`}
                        />
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-white/10 bg-slate-950/40 flex items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          Page <strong className="text-slate-200">{currentPage}</strong> of{" "}
          <strong className="text-slate-200">{totalPages}</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-all cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
