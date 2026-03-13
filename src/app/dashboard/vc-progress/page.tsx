import { fetchDashboardData } from '@/lib/sheets-client';
import { filterIssues, calcVcProgress, calcKpis, getUniqueVcNames, getUniqueAssignees, getUniqueYearMonths } from '@/lib/data-aggregator';
import { GlobalFilters } from '@/components/global-filters';
import { KpiCards } from '@/components/kpi-cards';
import { VcProgressChart } from '@/components/vc-progress-chart';

export const revalidate = 3600;

export default async function VcProgressPage({
  searchParams,
}: {
  searchParams: { vcName?: string; assignee?: string; yearMonth?: string };
}) {
  const data = await fetchDashboardData();
  const filtered = filterIssues(data.issues, searchParams);
  const vcProgress = calcVcProgress(filtered, data.forecasts);
  const kpi = calcKpis(filtered);

  return (
    <div className="space-y-6">
      <GlobalFilters
        vcNames={getUniqueVcNames(data.issues)}
        assignees={getUniqueAssignees(data.issues)}
        yearMonths={getUniqueYearMonths(data.issues)}
      />
      <KpiCards kpi={kpi} />
      <VcProgressChart data={vcProgress} />
    </div>
  );
}
