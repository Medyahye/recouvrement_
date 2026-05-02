import type {
  Client,
  ComparisonResponse,
  DashboardSummary,
  FabImport,
  GenerateReportResponse,
  PaginatedResponse,
  ReportEntry,
  Zone,
  ZoneDetail,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://127.0.0.1:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  getLatestImport: () => request<FabImport>("/imports/latest/"),
  getImports: () => request<FabImport[]>("/imports/"),
  getLatestComparison: () => request<ComparisonResponse>("/imports/comparison/latest/"),
  getDashboard: () => request<DashboardSummary>("/dashboard/latest/"),
  getLatestZones: (query = "") => request<PaginatedResponse<Zone>>(`/zones/latest/${query}`),
  getZoneDetail: (id: number) => request<ZoneDetail>(`/zones/${id}/`),
  getLatestClients: (query = "") => request<PaginatedResponse<Client>>(`/clients/latest/${query}`),
  getReports: () => request<ReportEntry[]>("/reports/"),
  generateReport: () => request<GenerateReportResponse>("/reports/generate/", { method: "POST" }),
};

export { API_BASE_URL };
