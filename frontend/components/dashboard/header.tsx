"use client";

import React from "react";
import { RefreshCw, PlusCircle, Zap, Radio } from "lucide-react";
import { HealthResponse } from "@/lib/types";

interface HeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
}

export function DashboardHeader({
  health,
  loading,
  onRefresh,
  onOpenAddModal,
  isStreaming,
  onToggleStreaming,
}: HeaderProps) {
  const isHealthy = health?.status === "ok" && health?.data_source_available;

  return (
    <header className="border-b border-white/10 pb-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/25 border border-white/10">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  Product Return Analytics
                </h1>
                {isStreaming && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    STREAM LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Weekly product-category return analysis, Kafka ingestion & high-return alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
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

          {/* Live Simulator Toggle */}
          <button
            onClick={onToggleStreaming}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              isStreaming
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-950/40"
                : "bg-slate-900/80 hover:bg-slate-800/80 border-white/10 text-slate-300"
            }`}
            title="Toggle automated real-time stream event generation"
          >
            <Zap
              className={`h-3.5 w-3.5 ${
                isStreaming ? "text-emerald-400 animate-bounce" : "text-amber-400"
              }`}
            />
            <span>{isStreaming ? "Pause Live Stream" : "Simulate Kafka Stream"}</span>
          </button>

          {/* Add Record Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 active:scale-95 border border-indigo-400/30 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all"
            title="Add a new return record to the analytics pipeline"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Add Return Record</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs sm:text-sm font-medium text-slate-200 transition-all disabled:opacity-50"
            title="Refresh analytics data from backend"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-indigo-400" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
