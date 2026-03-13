export interface IssueRow {
  issueKey: string;
  summary: string;
  statusName: string;
  statusGroup: string;
  milestone: string;
  vcName: string;
  yearMonth: string;
  round: string;
  type: string;
  assigneeInput: string;
  assigneeWc: string;
  hoursInput: string;
  hoursWc: string;
  deadlineInput: string;
  deadlineWc: string;
  deadlineFinal: string;
  completedDateFirst: string;
  completedDateAll: string;
  eventCount: string;
  shareholderCount: string;
  verdaFinancialAccuracy: string;
  verdaSecuritiesAccuracy: string;
}

export interface ForecastRow {
  vcName: string;
  yearMonth: string;
  forecastCount: number;
  notes: string;
}

export interface MetaData {
  lastSyncAt: string;
  issueCount: number;
  errorMessage: string;
}

// Aggregated types for views
export interface DeadlineAlert {
  issueKey: string;
  summary: string;
  vcName: string;
  assignee: string;
  deadlineFinal: string;
  statusGroup: string;
  daysUntilDeadline: number;
  urgency: 'overdue' | 'today' | 'soon-3d' | 'soon-7d' | 'normal';
}

export interface VcProgress {
  vcName: string;
  yearMonth: string;
  forecast: number;
  actual: number;
  achievementRate: number;
}

export interface StatusBreakdown {
  vcName: string;
  未着手: number;
  入力中: number;
  WC中: number;
  完了: number;
  total: number;
}

export interface KpiData {
  totalIssues: number;
  completedIssues: number;
  completionRate: number;
  todayDeadlineCount: number;
}

export interface DashboardData {
  issues: IssueRow[];
  forecasts: ForecastRow[];
  meta: MetaData;
}
