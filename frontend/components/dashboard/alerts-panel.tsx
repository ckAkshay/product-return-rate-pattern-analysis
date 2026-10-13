"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { ReturnRecord } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/formatters";

interface AlertsPanelProps {
  alerts: ReturnRecord[];
  loading: boolean;
  error?: string | null;
}

export function AlertsPanel({ alerts, loading, error }: AlertsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 mb-8 animate-pulse">
        <div className="h-5 w-48 bg-white/10 rounded mb-4" />
        <div className="h-16 w-full bg-white/5 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 mb-8 text-rose-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <span>High-Return Alerts Unavailable</span>
        </div>
        <p className="text-xs text-rose-400/80 mt-1">{error}</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 mb-8 flex items-center gap-4 text-emerald-300">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-emerald-200">
            No Active High-Return Alerts
          </h3>
          <p className="text-xs text-emerald-400/80 mt-0.5">
            All categories in the filtered range are operating within normal return-rate thresholds (&le; 10.0%).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-slate-900/80 to-slate-900/80 backdrop-blur-xl mb-8 overflow-hidden shadow-xl shadow-rose-950/20">
      {/* Banner Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              High-Return Alerts
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {alerts.length} Flagged
              </span>
            </h2>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Identified category-week combinations strictly exceeding the 10.0% threshold
            </p>
          </div>
        </div>

        <button className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Alert Cards Carousel / Grid */}
      {expanded && (
        <div className="p-5 pt-0 border-t border-rose-500/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
            {alerts.slice(0, 6).map((item, idx) => (
              <div
                key={`${item.category}-${item.week}-${idx}`}
                className="rounded-xl border border-rose-500/25 bg-slate-900/90 p-4 transition-all hover:border-rose-400/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-rose-400 tracking-wide uppercase">
                      {item.category}
                    </span>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Week: {item.week}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-rose-300 font-mono">
                      {formatPercent(item.return_rate)}
                    </span>
                    <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                      HIGH RETURNS
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>Sold: <strong className="text-slate-200">{formatNumber(item.total_sold)}</strong></span>
                  <span>Returned: <strong className="text-rose-300">{formatNumber(item.total_returned)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {alerts.length > 6 && (
            <p className="text-xs text-center text-slate-400 mt-4">
              Showing top 6 alerts out of {alerts.length} total anomalies. See full records in the results table below.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
