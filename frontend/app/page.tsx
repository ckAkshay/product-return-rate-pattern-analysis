"use client";

import React, { useEffect, useState, useCallback } from "react";
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
        setSummaryError(err instanceof Error ? err.message : "Failed to load summary");
      }

      // 3. Alerts
      try {
        const altRes = await fetchAlerts();
        setAlerts(altRes.alerts);
      } catch (err) {
        setAlertsError(err instanceof Error ? err.message : "Failed to load alerts");
      }

      // 4. Fetch all records for trend charts & weeks list
      try {
        const allRes = await fetchReturns({ page: 1, page_size: 0 });
        setAllChartRecords(allRes.data);
        const uniqueWeeks = Array.from(new Set(allRes.data.map((r) => r.week))).sort();
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
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 md:p-10 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <DashboardHeader
          health={health}
          loading={loading}
          onRefresh={() => {
            loadInitialData();
            loadTableData();
          }}
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

        {/* 5. Detailed Category-Wise Returns Table */}
        <CategoryReturnsTable
          records={tableRecords}
          loading={tableLoading}
          totalRecords={totalRecords}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </main>
  );
}
