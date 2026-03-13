import type { KpiData } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  className?: string;
}

function KpiCard({ title, value, className }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpi }: { kpi: KpiData }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KpiCard title="総課題数" value={kpi.totalIssues} />
      <KpiCard title="完了数" value={kpi.completedIssues} />
      <KpiCard title="完了率" value={formatPercent(kpi.completionRate)} />
      <KpiCard
        title="本日期限"
        value={kpi.todayDeadlineCount}
        className={kpi.todayDeadlineCount > 0 ? "text-destructive" : undefined}
      />
    </div>
  );
}
