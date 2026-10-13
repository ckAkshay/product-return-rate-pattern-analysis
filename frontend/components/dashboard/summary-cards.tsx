"use client";

import React from "react";
import { ShoppingBag, RotateCcw, Percent, AlertTriangle } from "lucide-react";
import { SummaryResponse } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/formatters";

interface SummaryCardsProps {
  summary: SummaryResponse | null;
  loading: boolean;
  error?: string | null;
}

export function SummaryCards({ summary, loading, error }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse p-6 flex flex-col justify-between"
          >
            <div className="h-4 w-28 bg-white/10 rounded" />
            <div className="h-8 w-36 bg-white/10 rounded" />
            <div className="h-3 w-24 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 mb-8 text-center text-rose-300">
        <p className="font-semibold">Unable to load summary metrics</p>
        <p className="text-xs text-rose-400/80 mt-1">
          {error || "Backend service returned no summary data."}
        </p>
      </div>
    );
  }

  const {
    total_sold,
    total_returned,
    overall_return_rate,
    high_return_records_count,
    high_return_categories_count,
    categories_count,
    reporting_period,
  } = summary;

  const isOverallRateHigh = overall_return_rate > 10.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* Card A: Total Units Sold */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 shadow-xl transition-all hover:border-indigo-500/40 hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Units Sold
          </span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatNumber(total_sold)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {categories_count} product categories tracked
          </p>
        </div>
      </div>

      {/* Card B: Total Units Returned */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 shadow-xl transition-all hover:border-cyan-500/40 hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Units Returned
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RotateCcw className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatNumber(total_returned)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {reporting_period.total_weeks} reporting weeks
          </p>
        </div>
      </div>

      {/* Card C: Overall Return Rate */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 shadow-xl transition-all hover:border-sky-500/40 hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Overall Return Rate
          </span>
          <div
            className={`p-2 rounded-xl border ${
              isOverallRateHigh
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            <Percent className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-3xl font-bold tracking-tight ${
              isOverallRateHigh ? "text-rose-400" : "text-sky-300"
            }`}
          >
            {formatPercent(overall_return_rate)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Target benchmark: &le; 10.0%
          </p>
        </div>
      </div>

      {/* Card D: High-Return Categories */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-slate-900/80 p-6 shadow-xl transition-all hover:border-rose-500/40 hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            High-Return Spikes
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-bold text-rose-400 tracking-tight">
            {high_return_records_count}
          </div>
          <p className="text-xs text-rose-300/80 mt-1">
            {high_return_categories_count} categories flagged overall (&gt;10%)
          </p>
        </div>
      </div>
    </div>
  );
}
