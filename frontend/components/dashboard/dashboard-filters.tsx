"use client";

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { FilterState } from "@/lib/types";

interface DashboardFiltersProps {
  filters: FilterState;
  categories: string[];
  weeks: string[];
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
}

export function DashboardFilters({
  filters,
  categories,
  weeks,
  onChange,
  onReset,
}: DashboardFiltersProps) {
  const hasActiveFilters =
    Boolean(filters.category) || Boolean(filters.week) || Boolean(filters.status);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 mb-8 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Title */}
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Filter className="h-4 w-4 text-indigo-400" />
          <span>Filter Analytics Data</span>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <select
              aria-label="Filter by Product Category"
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="bg-slate-950/80 border border-white/10 text-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Week Dropdown */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <select
              aria-label="Filter by Reporting Week"
              value={filters.week}
              onChange={(e) => onChange({ ...filters, week: e.target.value })}
              className="bg-slate-950/80 border border-white/10 text-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="">All Weeks</option>
              {weeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <select
              aria-label="Filter by Return Status"
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="bg-slate-950/80 border border-white/10 text-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="HIGH RETURNS">HIGH RETURNS (&gt;10%)</option>
              <option value="NORMAL">NORMAL (&le;10%)</option>
            </select>
          </div>

          {/* Reset Action */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-all cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
