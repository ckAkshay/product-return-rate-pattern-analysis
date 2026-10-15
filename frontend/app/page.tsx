"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  AlertsResponse,
  FilterState,
  HealthResponse,
  ReturnRecord,
  SummaryResponse,
} from "@/lib/types";
import {
  fetchAlerts,
  fetchHealth,
  fetchReturns,
  fetchSummary,
} from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { WeeklyReturnTrendChart } from "@/components/dashboard/return-trend-chart";
import { CategoryComparisonChart } from "@/components/dashboard/category-chart";
import { CategoryReturnsTable } from "@/components/dashboard/returns-table";
import { AddRecordModal } from "@/components/dashboard/add-record-modal";
import { AlertTriangle, CheckCircle2, Sparkles, X } from "lucide-react";

interface ToastNotification {
  id: string;
  type: "success" | "alert";
  title: string;
  message: string;
}

export default function AnalyticsDashboardPage() {
  // Global dashboard state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<ReturnRecord[]>([]);
  const [tableRecords, setTableRecords] = useState<ReturnRecord[]>([]);
  const [allChartRecords, setAllChartRecords] = useState<ReturnRecord[]>([]);

  // Metadata dropdowns
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [weeksList, setWeeksList] = useState<string[]>([]);

  // Dynamic feature state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Pagination & Filtering state
  const [filters, setFilters] = useState<FilterState>({
    category: "",
    week: "",
    status: "",
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const pageSize = 12;

  // Loading & Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Helper to push toast
  const addToast = useCallback((toast: Omit<ToastNotification, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Handle adding a new record dynamically to the state
  const handleAddRecord = useCallback(
    (newRecord: ReturnRecord, note?: string) => {
      const rateVal = newRecord.return_rate ?? 0;
      const isHigh = rateVal > 10.0;

      // 1. Prepend to table records (so it is visible on Page 1)
      setTableRecords((prev) => [newRecord, ...prev]);
      setTotalRecords((prev) => prev + 1);

      // 2. Add to allChartRecords for trend graphs
      setAllChartRecords((prev) => [newRecord, ...prev]);

      // 3. If High Return (>10%), prepend to live Alerts
      if (isHigh) {
        setAlerts((prev) => [newRecord, ...prev]);
      }

      // 4. Dynamically update summary KPIs
      setSummary((prev) => {
        if (!prev) return prev;
        const newTotalSold = prev.total_sold + newRecord.total_sold;
        const newTotalReturned = prev.total_returned + newRecord.total_returned;
        const newOverallRate = Number(
          ((newTotalReturned / newTotalSold) * 100).toFixed(2)
        );
        const newHighCount = isHigh
          ? prev.high_return_records_count + 1
          : prev.high_return_records_count;

        // Update category summary
        const updatedCatSummary = (prev.category_summary || []).map((cat) => {
          if (cat.category === newRecord.category) {
            const catSold = cat.total_sold + newRecord.total_sold;
            const catReturned = cat.total_returned + newRecord.total_returned;
            const catRate = Number(((catReturned / catSold) * 100).toFixed(2));
            const newStatus: "NORMAL" | "HIGH RETURNS" = catRate > 10.0 ? "HIGH RETURNS" : "NORMAL";
            return {
              ...cat,
              total_sold: catSold,
              total_returned: catReturned,
              return_rate: catRate,
              status: newStatus,
            };
          }
          return cat;
        });

        return {
          ...prev,
          total_sold: newTotalSold,
          total_returned: newTotalReturned,
          overall_return_rate: newOverallRate,
          high_return_records_count: newHighCount,
          category_summary: updatedCatSummary,
          last_updated: new Date().toISOString(),
        };
      });

      // 5. Update categories & weeks lists if novel
      if (!categoriesList.includes(newRecord.category)) {
        setCategoriesList((prev) => [...prev, newRecord.category]);
      }
      if (!weeksList.includes(newRecord.week)) {
        setWeeksList((prev) => [...prev, newRecord.week].sort());
      }

      // 6. Trigger Toast Notification
      if (isHigh) {
        addToast({
          type: "alert",
          title: `⚠️ High-Return Alert: ${newRecord.category}`,
          message: `${newRecord.week}: Return rate spiked to ${newRecord.return_rate}% (${newRecord.total_returned}/${newRecord.total_sold} units). ${note ? `Note: ${note}` : ""}`,
        });
      } else {
        addToast({
          type: "success",
          title: `✅ Record Logged: ${newRecord.category}`,
          message: `${newRecord.week}: Normal return rate of ${newRecord.return_rate}% (${newRecord.total_returned}/${newRecord.total_sold} units).`,
        });
      }
    },
    [categoriesList, weeksList, addToast]
  );

  // Live Stream Simulation Effect
  useEffect(() => {
    if (!isStreaming) return;

    const availableCategories =
      categoriesList.length > 0
        ? categoriesList
        : ["Footwear", "Clothing", "Electronics", "Furniture", "Toys"];

    const interval = setInterval(() => {
      // Pick random category
      const randomCat =
        availableCategories[
          Math.floor(Math.random() * availableCategories.length)
        ];
      const randomWeek = "2025-W14";
      const sold = Math.floor(Math.random() * 90) + 100; // 100 - 190
      // 40% chance of high return
      const isSpike = Math.random() < 0.4;
      const returned = isSpike
        ? Math.floor(Math.random() * 25) + 22 // 22 - 47 (>11%)
        : Math.floor(Math.random() * 8) + 3; // 3 - 11 (<9%)

      const rate = Number(((returned / sold) * 100).toFixed(2));

      const simulatedRecord: ReturnRecord = {
        week: randomWeek,
        category: randomCat,
        total_sold: sold,
        total_returned: returned,
        return_rate: rate,
        status: rate > 10.0 ? "HIGH RETURNS" : "NORMAL",
        flagged: rate > 10.0,
      };

      handleAddRecord(simulatedRecord, "Simulated Kafka Stream batch");
    }, 4500);

    return () => clearInterval(interval);
  }, [isStreaming, categoriesList, handleAddRecord]);

  // Load initial summary, health, and all records for trend charts
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setSummaryError(null);
    setAlertsError(null);

    try {
      // 1. Health check
      try {
        const healthRes = await fetchHealth();
        setHealth(healthRes);
      } catch {
        setHealth({
          status: "error",
          service: "product-return-rate-backend",
          data_source_available: false,
        });
      }

      // 2. Summary KPIs
      try {
        const sumRes = await fetchSummary();
        setSummary(sumRes);
        if (sumRes.category_summary) {
          setCategoriesList(sumRes.category_summary.map((c) => c.category));
        }
      } catch (err) {
        setSummaryError(
          err instanceof Error ? err.message : "Failed to load summary"
        );
      }

      // 3. Alerts
      try {
        const altRes = await fetchAlerts();
        setAlerts(altRes.alerts);
      } catch (err) {
        setAlertsError(
          err instanceof Error ? err.message : "Failed to load alerts"
        );
      }

      // 4. Fetch all records for trend charts & weeks list
      try {
        const allRes = await fetchReturns({ page: 1, page_size: 0 });
        setAllChartRecords(allRes.data);
        const uniqueWeeks = Array.from(
          new Set(allRes.data.map((r) => r.week))
        ).sort();
        setWeeksList(uniqueWeeks);
      } catch {
        // Handled in table load
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch paginated table records based on filters
  const loadTableData = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetchReturns({
        category: filters.category || undefined,
        week: filters.week || undefined,
        status: filters.status || undefined,
        page: currentPage,
        page_size: pageSize,
      });
      setTableRecords(res.data);
      setTotalRecords(res.total_records);
    } catch {
      setTableRecords([]);
      setTotalRecords(0);
    } finally {
      setTableLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Handle filter changes (resets to page 1)
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ category: "", week: "", status: "" });
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 md:p-10 font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-3 duration-300 transition-all ${
              t.type === "alert"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-950/40"
                : "bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-indigo-950/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {t.type === "alert" ? (
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {t.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {t.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== t.id))
                }
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header with Add Record & Stream simulator controls */}
        <DashboardHeader
          health={health}
          loading={loading}
          onRefresh={() => {
            loadInitialData();
            loadTableData();
          }}
          onOpenAddModal={() => setIsModalOpen(true)}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming(!isStreaming)}
        />

        {/* 1. Summary KPI Cards */}
        <SummaryCards
          summary={summary}
          loading={loading}
          error={summaryError}
        />

        {/* 2. High-Return Alerts Section */}
        <AlertsPanel
          alerts={alerts}
          loading={loading}
          error={alertsError}
        />

        {/* 3. Global Filters Bar */}
        <DashboardFilters
          filters={filters}
          categories={categoriesList}
          weeks={weeksList}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* 4. Analytics Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <WeeklyReturnTrendChart
            records={allChartRecords}
            loading={loading}
            selectedCategory={filters.category || undefined}
          />
          <CategoryComparisonChart
            categories={summary?.category_summary || []}
            loading={loading}
          />
        </div>

        {/* 5. Detailed Category-Wise Returns Table with Search, Export CSV, and Add shortcut */}
        <CategoryReturnsTable
          records={tableRecords}
          loading={tableLoading}
          totalRecords={totalRecords}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onOpenAddModal={() => setIsModalOpen(true)}
        />
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddRecord={handleAddRecord}
        existingCategories={categoriesList}
        existingWeeks={weeksList}
      />
    </main>
  );
}
