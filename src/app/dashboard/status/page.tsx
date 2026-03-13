import { fetchDashboardData } from "@/lib/sheets-client";
import {
  filterIssues,
  calcStatusBreakdown,
  calcKpis,
  getUniqueVcNames,
  getUniqueAssignees,
  getUniqueYearMonths,
} from "@/lib/data-aggregator";
import { GlobalFilters } from "@/components/global-filters";
import { KpiCards } from "@/components/kpi-cards";
import { StatusBreakdownChart } from "@/components/status-breakdown-chart";

export const revalidate = 3600;

export default async function StatusPage({
  searchParams,
}: {
  searchParams: { vcName?: string; assignee?: string; yearMonth?: string };
}) {
  const data = await fetchDashboardData();
  const filtered = filterIssues(data.issues, searchParams);
  const breakdown = calcStatusBreakdown(filtered);
  const kpi = calcKpis(filtered);

  return (
    <div className="space-y-6">
      <GlobalFilters
        vcNames={getUniqueVcNames(data.issues)}
        assignees={getUniqueAssignees(data.issues)}
        yearMonths={getUniqueYearMonths(data.issues)}
      />
      <KpiCards kpi={kpi} />
      <StatusBreakdownChart data={breakdown} />
    </div>
  );
}
