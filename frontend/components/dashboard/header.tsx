"use client";

import React from "react";
import { RefreshCw, Activity, AlertCircle } from "lucide-react";
import { HealthResponse } from "@/lib/types";

interface HeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ health, loading, onRefresh }: HeaderProps) {
  const isHealthy = health?.status === "ok" && health?.data_source_available;

  return (
    <header className="border-b border-white/10 pb-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
              📊
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Product Return Analytics
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Weekly product-category return analysis and high-return alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Health Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              isHealthy
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-rose-400 shadow-[0_0_8px_#fb7185]"
              }`}
            />
            <span>
              {health
                ? isHealthy
                  ? "Backend Connected"
                  : "Data Unavailable"
                : "Checking Connection..."}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-sm font-medium text-slate-200 transition-all disabled:opacity-50"
            title="Refresh analytics data from backend"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-indigo-400" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
