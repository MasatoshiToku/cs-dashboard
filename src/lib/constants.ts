export const STATUS_GROUPS = ['未着手', '入力中', 'WC中', '完了'] as const;

export const STATUS_GROUP_COLORS: Record<string, string> = {
  '未着手': '#94a3b8',  // slate-400
  '入力中': '#60a5fa',  // blue-400
  'WC中': '#fbbf24',    // amber-400
  '完了': '#34d399',    // emerald-400
};

export const URGENCY_COLORS: Record<string, string> = {
  overdue: 'destructive',
  today: 'destructive',
  'soon-3d': 'warning',
  'soon-7d': 'secondary',
  normal: 'outline',
};

// Badge variant mapping for shadcn
export const URGENCY_BADGE_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  overdue: 'destructive',
  today: 'destructive',
  'soon-3d': 'default',
  'soon-7d': 'secondary',
  normal: 'outline',
};

export const URGENCY_LABELS: Record<string, string> = {
  overdue: '超過',
  today: '本日',
  'soon-3d': '3日以内',
  'soon-7d': '1週間以内',
  normal: '余裕あり',
};

export const ISSUES_HEADERS = [
  'issueKey', 'summary', 'statusName', 'statusGroup', 'milestone',
  'vcName', 'yearMonth', 'round', 'type',
  'assigneeInput', 'assigneeWc',
  'hoursInput', 'hoursWc',
  'deadlineInput', 'deadlineWc', 'deadlineFinal',
  'completedDateFirst', 'completedDateAll',
  'eventCount', 'shareholderCount',
  'verdaFinancialAccuracy', 'verdaSecuritiesAccuracy',
] as const;

export const FORECASTS_HEADERS = ['vcName', 'yearMonth', 'forecastCount', 'notes'] as const;
