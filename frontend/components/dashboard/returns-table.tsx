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
}

export function CategoryReturnsTable({
  records,
  loading,
  totalRecords,
  currentPage,
  pageSize,
  onPageChange,
}: ReturnsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden mb-8">
      <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white">
            Category-Wise Weekly Results
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full audit log of MapReduce aggregated return metrics
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong>{records.length}</strong> of <strong>{totalRecords}</strong> records
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
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-slate-600" />
                    <p className="font-semibold text-slate-300">No records found</p>
                    <p className="text-xs text-slate-500">
                      Try adjusting or resetting your filter criteria.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((r, idx) => {
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
