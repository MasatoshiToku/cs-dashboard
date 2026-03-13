import { fetchDashboardData } from "@/lib/sheets-client";
import {
  filterIssues,
  calcDeadlineAlerts,
  calcKpis,
  getUniqueVcNames,
  getUniqueAssignees,
  getUniqueYearMonths,
} from "@/lib/data-aggregator";
import { GlobalFilters } from "@/components/global-filters";
import { KpiCards } from "@/components/kpi-cards";
import { DeadlineTable } from "@/components/deadline-table";

export const dynamic = 'force-dynamic';

export default async function DeadlinePage({
  searchParams,
}: {
  searchParams: { vcName?: string; assignee?: string; yearMonth?: string };
}) {
  const data = await fetchDashboardData();
  const filtered = filterIssues(data.issues, searchParams);
  const alerts = calcDeadlineAlerts(filtered);
  const kpi = calcKpis(filtered);

  return (
    <div className="space-y-6">
      <GlobalFilters
        vcNames={getUniqueVcNames(data.issues)}
        assignees={getUniqueAssignees(data.issues)}
        yearMonths={getUniqueYearMonths(data.issues)}
      />
      <KpiCards kpi={kpi} />
      <DeadlineTable alerts={alerts} />
    </div>
  );
}
