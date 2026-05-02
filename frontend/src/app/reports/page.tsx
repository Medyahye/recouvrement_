import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { api } from "@/lib/api";

export default async function ReportsPage() {
  const latestImport = await api.getLatestImport();
  const reports = await api.getReports();

  return <ReportsPageClient initialLatestImport={latestImport} initialReports={reports ?? []} />;
}
