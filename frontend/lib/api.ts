/**
 * Centralized API Service for Product Return Analytics Dashboard
 * Connects to the Task 6 FastAPI Backend endpoints.
 */

import {
  AlertsResponse,
  HealthResponse,
  ReturnsResponse,
  SummaryResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...options?.headers,
      },
      // Avoid stale Next.js cache for real-time reporting
      cache: "no-store",
    });

    if (!res.ok) {
      let errorMsg = `API request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = String(errorData.detail);
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("An unexpected network error occurred while contacting the backend.");
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export async function fetchSummary(): Promise<SummaryResponse> {
  return request<SummaryResponse>("/api/summary");
}

export async function fetchReturns(params?: {
  category?: string;
  week?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<ReturnsResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", params.category);
  if (params?.week) query.append("week", params.week);
  if (params?.status) query.append("status", params.status);
  if (params?.page !== undefined) query.append("page", String(params.page));
  if (params?.page_size !== undefined) query.append("page_size", String(params.page_size));

  const qs = query.toString();
  return request<ReturnsResponse>(`/api/returns${qs ? `?${qs}` : ""}`);
}

export async function fetchAlerts(params?: {
  category?: string;
  week?: string;
}): Promise<AlertsResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", params.category);
  if (params?.week) query.append("week", params.week);

  const qs = query.toString();
  return request<AlertsResponse>(`/api/alerts${qs ? `?${qs}` : ""}`);
}
