import type { IssueRow, ForecastRow, DeadlineAlert, VcProgress, StatusBreakdown, KpiData } from './types';
import { diffDays } from './utils';

export function filterIssues(
  issues: IssueRow[],
  filters: { vcName?: string; assignee?: string; yearMonth?: string }
): IssueRow[] {
  return issues.filter(issue => {
    if (filters.vcName && issue.vcName !== filters.vcName) return false;
    if (filters.assignee && issue.assigneeInput !== filters.assignee && issue.assigneeWc !== filters.assignee) return false;
    if (filters.yearMonth && issue.yearMonth !== filters.yearMonth) return false;
    return true;
  });
}

export function calcDeadlineAlerts(issues: IssueRow[]): DeadlineAlert[] {
  return issues
    .filter(issue => issue.deadlineFinal && issue.statusGroup !== '完了')
    .map(issue => {
      const days = diffDays(issue.deadlineFinal);
      let urgency: DeadlineAlert['urgency'];
      if (days < 0) urgency = 'overdue';
      else if (days === 0) urgency = 'today';
      else if (days <= 3) urgency = 'soon-3d';
      else if (days <= 7) urgency = 'soon-7d';
      else urgency = 'normal';

      return {
        issueKey: issue.issueKey,
        summary: issue.summary,
        vcName: issue.vcName,
        assignee: issue.assigneeInput || issue.assigneeWc || '-',
        deadlineFinal: issue.deadlineFinal,
        statusGroup: issue.statusGroup,
        daysUntilDeadline: days,
        urgency,
      };
    })
    .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
}

export function calcVcProgress(issues: IssueRow[], forecasts: ForecastRow[]): VcProgress[] {
  const actualMap = new Map<string, number>();
  issues.forEach(issue => {
    if (issue.statusGroup === '完了' && issue.vcName && issue.yearMonth) {
      const key = `${issue.vcName}|${issue.yearMonth}`;
      actualMap.set(key, (actualMap.get(key) || 0) + 1);
    }
  });

  return forecasts.map(f => {
    const key = `${f.vcName}|${f.yearMonth}`;
    const actual = actualMap.get(key) || 0;
    const achievementRate = f.forecastCount > 0 ? (actual / f.forecastCount) * 100 : 0;
    return {
      vcName: f.vcName,
      yearMonth: f.yearMonth,
      forecast: f.forecastCount,
      actual,
      achievementRate,
    };
  });
}

export function calcStatusBreakdown(issues: IssueRow[]): StatusBreakdown[] {
  const map = new Map<string, StatusBreakdown>();

  issues.forEach(issue => {
    const vc = issue.vcName || '(未設定)';
    if (!map.has(vc)) {
      map.set(vc, { vcName: vc, 未着手: 0, 入力中: 0, WC中: 0, 完了: 0, total: 0 });
    }
    const entry = map.get(vc)!;
    const group = issue.statusGroup;
    if (group === '未着手' || group === '入力中' || group === 'WC中' || group === '完了') {
      entry[group] += 1;
    }
    entry.total += 1;
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function calcKpis(issues: IssueRow[]): KpiData {
  const totalIssues = issues.length;
  const completedIssues = issues.filter(i => i.statusGroup === '完了').length;
  const completionRate = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const todayDeadlineCount = issues.filter(i => {
    if (!i.deadlineFinal || i.statusGroup === '完了') return false;
    const d = new Date(i.deadlineFinal);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0] === todayStr;
  }).length;

  return { totalIssues, completedIssues, completionRate, todayDeadlineCount };
}

export function getUniqueVcNames(issues: IssueRow[]): string[] {
  return Array.from(new Set(issues.map(i => i.vcName).filter(Boolean))).sort();
}

export function getUniqueAssignees(issues: IssueRow[]): string[] {
  const set = new Set<string>();
  issues.forEach(i => {
    if (i.assigneeInput) set.add(i.assigneeInput);
    if (i.assigneeWc) set.add(i.assigneeWc);
  });
  return Array.from(set).sort();
}

export function getUniqueYearMonths(issues: IssueRow[]): string[] {
  return Array.from(new Set(issues.map(i => i.yearMonth).filter(Boolean))).sort().reverse();
}
