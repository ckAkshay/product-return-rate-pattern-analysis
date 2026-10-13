"use client";

import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ReturnRecord } from "@/lib/types";

interface TrendChartProps {
  records: ReturnRecord[];
  loading: boolean;
  selectedCategory?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Footwear: "#f43f5e",     // Rose
  Clothing: "#fb923c",     // Orange
  Sports: "#38bdf8",       // Sky
  Beauty: "#a855f7",       // Purple
  Electronics: "#eab308",  // Yellow
  "Home & Kitchen": "#10b981", // Emerald
  Furniture: "#ec4899",    // Pink
  Toys: "#6366f1",         // Indigo
};

export function WeeklyReturnTrendChart({
  records,
  loading,
  selectedCategory,
}: TrendChartProps) {
  // Collect all unique categories
  const allCategories = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.category))).sort();
  }, [records]);

  // Active category lines state (default to all or filtered)
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // Synchronize with external filter or set defaults
  const visibleCategories = useMemo(() => {
    if (selectedCategory) return [selectedCategory];
    if (activeCategories.length > 0) return activeCategories;
    return allCategories;
  }, [selectedCategory, activeCategories, allCategories]);

  // Pivot records: week -> { week, [category]: return_rate }
  const chartData = useMemo(() => {
    const weeksMap = new Map<string, Record<string, number | string>>();

    records.forEach((r) => {
      if (!weeksMap.has(r.week)) {
        weeksMap.set(r.week, { week: r.week });
      }
      const entry = weeksMap.get(r.week)!;
      if (r.return_rate !== null && r.return_rate !== undefined) {
        entry[r.category] = Number(r.return_rate);
      }
    });

    return Array.from(weeksMap.values()).sort((a, b) =>
      String(a.week).localeCompare(String(b.week))
    );
  }, [records]);

  const toggleCategory = (cat: string) => {
    if (selectedCategory) return; // locked by filter
    if (activeCategories.length === 0) {
      // currently showing all, switch to showing all except this one, or just this one?
      // toggle logic: if all visible, switch to just this one
      setActiveCategories([cat]);
      return;
    }
    if (activeCategories.includes(cat)) {
      const next = activeCategories.filter((c) => c !== cat);
      setActiveCategories(next.length === 0 ? allCategories : next);
    } else {
      setActiveCategories([...activeCategories, cat]);
    }
  };

  if (loading) {
    return (
      <div className="h-96 rounded-2xl bg-slate-900/60 border border-white/10 p-6 animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Loading Return-Rate Trends...</span>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-96 rounded-2xl bg-slate-900/60 border border-white/10 p-6 flex items-center justify-center text-slate-400 text-sm">
        No weekly trend data matching the selected filter.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white">
            Weekly Return-Rate Trend
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Week-over-week return rate trajectories with 10.0% alert threshold line
          </p>
        </div>

        {/* Category Pill Selector (prevents visual clutter) */}
        {!selectedCategory && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase mr-1">
              Toggle Lines:
            </span>
            {allCategories.map((cat) => {
              const isSelected = visibleCategories.includes(cat);
              const color = CATEGORY_COLORS[cat] || "#94a3b8";
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                  style={{
                    borderColor: isSelected ? color : "transparent",
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1.5"
                    style={{ backgroundColor: color }}
                  />
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="week"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              unit="%"
              domain={[0, (dataMax: number) => Math.max(35, Math.ceil(dataMax + 5))]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
              }}
              formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
              iconType="circle"
            />
            <ReferenceLine
              y={10}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "10% Alert Threshold",
                fill: "#fda4af",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            {allCategories.map((cat) => {
              if (!visibleCategories.includes(cat)) return null;
              const color = CATEGORY_COLORS[cat] || "#94a3b8";
              return (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
