/**
 * TypeScript Type Definitions for Product Return Analytics Dashboard
 * Aligned with the Task 6 FastAPI backend response schemas.
 */

export interface HealthResponse {
  status: string;
  service: string;
  data_source_available: boolean;
  data_source_name?: string;
  records_count?: number;
  last_modified?: string;
}

export interface CategorySummary {
  category: string;
  total_sold: number;
  total_returned: number;
  return_rate: number;
  status: "NORMAL" | "HIGH RETURNS" | "Undefined";
}

export interface ReportingPeriod {
  start_week: string | null;
  end_week: string | null;
  total_weeks: number;
}

export interface SummaryResponse {
  total_sold: number;
  total_returned: number;
  overall_return_rate: number;
  high_return_records_count: number;
  high_return_categories_count: number;
  high_return_categories: CategorySummary[];
  category_summary: CategorySummary[];
  categories_count: number;
  reporting_period: ReportingPeriod;
  threshold_percentage: number;
  last_updated: string | null;
}

export interface ReturnRecord {
  week: string;
  category: string;
  total_sold: number;
  total_returned: number;
  return_rate: number | null;
  status: "NORMAL" | "HIGH RETURNS" | "Undefined";
  flagged?: boolean;
}

export interface ReturnsResponse {
  total_records: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: ReturnRecord[];
}

export interface AlertsResponse {
  alert_count: number;
  threshold_percentage: number;
  alerts: ReturnRecord[];
}

export interface FilterState {
  category: string;
  week: string;
  status: string;
}
