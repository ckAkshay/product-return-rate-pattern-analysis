"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { CategorySummary } from "@/lib/types";

interface CategoryChartProps {
  categories: CategorySummary[];
  loading: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: CategorySummary;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isHigh = data.return_rate > 10.0;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl text-xs">
        <p className="font-bold text-white mb-1.5">{data.category}</p>
        <div className="space-y-1 text-slate-300">
          <p className="flex justify-between gap-4">
            <span>Return Rate:</span>
            <strong className={isHigh ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"}>
              {data.return_rate.toFixed(2)}%
            </strong>
          </p>
          <p className="flex justify-between gap-4">
            <span>Units Sold:</span>
            <strong className="text-white">{data.total_sold.toLocaleString()}</strong>
          </p>
          <p className="flex justify-between gap-4">
            <span>Units Returned:</span>
            <strong className="text-white">{data.total_returned.toLocaleString()}</strong>
          </p>
          <p className="flex justify-between gap-4 pt-1 border-t border-white/10">
            <span>Status:</span>
            <strong className={isHigh ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              {data.status}
            </strong>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function CategoryComparisonChart({ categories, loading }: CategoryChartProps) {
  if (loading) {
    return (
      <div className="h-80 rounded-2xl bg-slate-900/60 border border-white/10 p-6 animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Loading Category Comparison...</span>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="h-80 rounded-2xl bg-slate-900/60 border border-white/10 p-6 flex items-center justify-center text-slate-400 text-sm">
        No category data available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-base font-bold text-white">
            Category Return Rate Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Overall return rates across categories vs 10.0% alert benchmark
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-500" />
            <span className="text-slate-400">&gt; 10% (High)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-slate-400">&le; 10% (Normal)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={categories}
            margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="category"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              unit="%"
              domain={[0, (dataMax: number) => Math.max(20, Math.ceil(dataMax + 2))]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine
              y={10}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "10% Threshold",
                fill: "#fda4af",
                fontSize: 10,
                position: "right",
              }}
            />
            <Bar dataKey="return_rate" radius={[6, 6, 0, 0]} maxBarSize={45}>
              {categories.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.return_rate > 10.0 ? "#f43f5e" : "#10b981"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
