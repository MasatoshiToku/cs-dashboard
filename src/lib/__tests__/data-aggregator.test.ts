import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  filterIssues,
  calcDeadlineAlerts,
  calcVcProgress,
  calcStatusBreakdown,
  calcKpis,
  getUniqueVcNames,
  getUniqueAssignees,
  getUniqueYearMonths,
} from '../data-aggregator';
import type { IssueRow, ForecastRow } from '../types';

function createIssue(overrides: Partial<IssueRow> = {}): IssueRow {
  return {
    issueKey: 'TEST-1',
    summary: 'Test issue',
    statusName: '未対応',
    statusGroup: '未着手',
    milestone: 'VC-A 2025/03 1回目',
    vcName: 'VC-A',
    yearMonth: '2025/03',
    round: '1回目',
    type: '入力',
    assigneeInput: '担当者A',
    assigneeWc: '',
    hoursInput: '2',
    hoursWc: '',
    deadlineInput: '',
    deadlineWc: '',
    deadlineFinal: '',
    completedDateFirst: '',
    completedDateAll: '',
    eventCount: '3',
    shareholderCount: '100',
    verdaFinancialAccuracy: '',
    verdaSecuritiesAccuracy: '',
    ...overrides,
  };
}

// ---- filterIssues ----
describe('filterIssues', () => {
  const issues = [
    createIssue({ issueKey: 'A-1', vcName: 'VC-A', assigneeInput: '担当者A', assigneeWc: '', yearMonth: '2025/03' }),
    createIssue({ issueKey: 'B-1', vcName: 'VC-B', assigneeInput: '', assigneeWc: '担当者B', yearMonth: '2025/04' }),
    createIssue({ issueKey: 'A-2', vcName: 'VC-A', assigneeInput: '担当者C', assigneeWc: '', yearMonth: '2025/04' }),
  ];

  it('returns all issues when no filters', () => {
    expect(filterIssues(issues, {})).toHaveLength(3);
  });

  it('filters by vcName', () => {
    const result = filterIssues(issues, { vcName: 'VC-A' });
    expect(result).toHaveLength(2);
    expect(result.every(i => i.vcName === 'VC-A')).toBe(true);
  });

  it('filters by assignee (assigneeInput)', () => {
    const result = filterIssues(issues, { assignee: '担当者A' });
    expect(result).toHaveLength(1);
    expect(result[0].issueKey).toBe('A-1');
  });

  it('filters by assignee (assigneeWc)', () => {
    const result = filterIssues(issues, { assignee: '担当者B' });
    expect(result).toHaveLength(1);
    expect(result[0].issueKey).toBe('B-1');
  });

  it('filters by yearMonth', () => {
    const result = filterIssues(issues, { yearMonth: '2025/04' });
    expect(result).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    const result = filterIssues(issues, { vcName: 'VC-A', yearMonth: '2025/04' });
    expect(result).toHaveLength(1);
    expect(result[0].issueKey).toBe('A-2');
  });

  it('returns empty array when no matches', () => {
    const result = filterIssues(issues, { vcName: 'VC-X' });
    expect(result).toHaveLength(0);
  });
});

// ---- calcDeadlineAlerts ----
describe('calcDeadlineAlerts', () => {
  // Use fake timers to control "today"
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T00:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('excludes completed issues', () => {
    const issues = [createIssue({ statusGroup: '完了', deadlineFinal: '2025-06-10' })];
    expect(calcDeadlineAlerts(issues)).toHaveLength(0);
  });

  it('excludes issues without deadlineFinal', () => {
    const issues = [createIssue({ deadlineFinal: '' })];
    expect(calcDeadlineAlerts(issues)).toHaveLength(0);
  });

  it('marks overdue correctly (past date)', () => {
    const issues = [createIssue({ deadlineFinal: '2025-06-13', statusGroup: '入力中' })];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].urgency).toBe('overdue');
    expect(alerts[0].daysUntilDeadline).toBe(-2);
  });

  it('marks today correctly', () => {
    const issues = [createIssue({ deadlineFinal: '2025-06-15', statusGroup: '入力中' })];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts[0].urgency).toBe('today');
    expect(alerts[0].daysUntilDeadline).toBe(0);
  });

  it('marks soon-3d correctly', () => {
    const issues = [createIssue({ deadlineFinal: '2025-06-17', statusGroup: '入力中' })];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts[0].urgency).toBe('soon-3d');
  });

  it('marks soon-7d correctly', () => {
    const issues = [createIssue({ deadlineFinal: '2025-06-21', statusGroup: '入力中' })];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts[0].urgency).toBe('soon-7d');
  });

  it('marks normal correctly', () => {
    const issues = [createIssue({ deadlineFinal: '2025-06-30', statusGroup: '入力中' })];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts[0].urgency).toBe('normal');
  });

  it('sorts by daysUntilDeadline ascending', () => {
    const issues = [
      createIssue({ issueKey: 'FAR', deadlineFinal: '2025-06-30', statusGroup: '入力中' }),
      createIssue({ issueKey: 'PAST', deadlineFinal: '2025-06-10', statusGroup: '入力中' }),
      createIssue({ issueKey: 'SOON', deadlineFinal: '2025-06-16', statusGroup: '入力中' }),
    ];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts[0].issueKey).toBe('PAST');
    expect(alerts[1].issueKey).toBe('SOON');
    expect(alerts[2].issueKey).toBe('FAR');
  });

  it('uses assigneeInput when available, falls back to assigneeWc', () => {
    const issues = [
      createIssue({ deadlineFinal: '2025-06-20', statusGroup: '入力中', assigneeInput: '田中', assigneeWc: '' }),
      createIssue({ deadlineFinal: '2025-06-20', statusGroup: '入力中', assigneeInput: '', assigneeWc: '佐藤' }),
      createIssue({ deadlineFinal: '2025-06-20', statusGroup: '入力中', assigneeInput: '', assigneeWc: '' }),
    ];
    const alerts = calcDeadlineAlerts(issues);
    expect(alerts[0].assignee).toBe('田中');
    expect(alerts[1].assignee).toBe('佐藤');
    expect(alerts[2].assignee).toBe('-');
  });
});

// ---- calcVcProgress ----
describe('calcVcProgress', () => {
  it('calculates actual count from completed issues', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '完了' }),
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '完了' }),
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '入力中' }),
    ];
    const forecasts: ForecastRow[] = [
      { vcName: 'VC-A', yearMonth: '2025/03', forecastCount: 5, notes: '' },
    ];
    const result = calcVcProgress(issues, forecasts);
    expect(result[0].actual).toBe(2);
    expect(result[0].forecast).toBe(5);
  });

  it('matches forecast data correctly', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '完了' }),
      createIssue({ vcName: 'VC-B', yearMonth: '2025/04', statusGroup: '完了' }),
    ];
    const forecasts: ForecastRow[] = [
      { vcName: 'VC-A', yearMonth: '2025/03', forecastCount: 10, notes: '' },
      { vcName: 'VC-B', yearMonth: '2025/04', forecastCount: 5, notes: '' },
    ];
    const result = calcVcProgress(issues, forecasts);
    expect(result).toHaveLength(2);
    expect(result[0].actual).toBe(1);
    expect(result[1].actual).toBe(1);
  });

  it('calculates achievementRate correctly', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '完了' }),
    ];
    const forecasts: ForecastRow[] = [
      { vcName: 'VC-A', yearMonth: '2025/03', forecastCount: 4, notes: '' },
    ];
    const result = calcVcProgress(issues, forecasts);
    expect(result[0].achievementRate).toBe(25);
  });

  it('handles zero forecast (0% achievement)', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '完了' }),
    ];
    const forecasts: ForecastRow[] = [
      { vcName: 'VC-A', yearMonth: '2025/03', forecastCount: 0, notes: '' },
    ];
    const result = calcVcProgress(issues, forecasts);
    expect(result[0].achievementRate).toBe(0);
  });

  it('returns 0 actual when no completed issues match', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', yearMonth: '2025/03', statusGroup: '入力中' }),
    ];
    const forecasts: ForecastRow[] = [
      { vcName: 'VC-A', yearMonth: '2025/03', forecastCount: 5, notes: '' },
    ];
    const result = calcVcProgress(issues, forecasts);
    expect(result[0].actual).toBe(0);
  });
});

// ---- calcStatusBreakdown ----
describe('calcStatusBreakdown', () => {
  it('groups by vcName', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', statusGroup: '未着手' }),
      createIssue({ vcName: 'VC-B', statusGroup: '完了' }),
    ];
    const result = calcStatusBreakdown(issues);
    expect(result).toHaveLength(2);
  });

  it('counts each status group correctly', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', statusGroup: '未着手' }),
      createIssue({ vcName: 'VC-A', statusGroup: '入力中' }),
      createIssue({ vcName: 'VC-A', statusGroup: '入力中' }),
      createIssue({ vcName: 'VC-A', statusGroup: 'WC中' }),
      createIssue({ vcName: 'VC-A', statusGroup: '完了' }),
      createIssue({ vcName: 'VC-A', statusGroup: '完了' }),
      createIssue({ vcName: 'VC-A', statusGroup: '完了' }),
    ];
    const result = calcStatusBreakdown(issues);
    expect(result[0].未着手).toBe(1);
    expect(result[0].入力中).toBe(2);
    expect(result[0].WC中).toBe(1);
    expect(result[0].完了).toBe(3);
  });

  it('calculates total correctly', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', statusGroup: '未着手' }),
      createIssue({ vcName: 'VC-A', statusGroup: '完了' }),
    ];
    const result = calcStatusBreakdown(issues);
    expect(result[0].total).toBe(2);
  });

  it('sorts by total descending', () => {
    const issues = [
      createIssue({ vcName: 'VC-A', statusGroup: '未着手' }),
      createIssue({ vcName: 'VC-B', statusGroup: '完了' }),
      createIssue({ vcName: 'VC-B', statusGroup: '入力中' }),
      createIssue({ vcName: 'VC-B', statusGroup: '未着手' }),
    ];
    const result = calcStatusBreakdown(issues);
    expect(result[0].vcName).toBe('VC-B');
    expect(result[0].total).toBe(3);
    expect(result[1].vcName).toBe('VC-A');
    expect(result[1].total).toBe(1);
  });

  it('uses "(未設定)" for empty vcName', () => {
    const issues = [createIssue({ vcName: '', statusGroup: '未着手' })];
    const result = calcStatusBreakdown(issues);
    expect(result[0].vcName).toBe('(未設定)');
  });
});

// ---- calcKpis ----
describe('calcKpis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T00:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates totalIssues correctly', () => {
    const issues = [createIssue(), createIssue(), createIssue()];
    expect(calcKpis(issues).totalIssues).toBe(3);
  });

  it('calculates completedIssues correctly', () => {
    const issues = [
      createIssue({ statusGroup: '完了' }),
      createIssue({ statusGroup: '入力中' }),
      createIssue({ statusGroup: '完了' }),
    ];
    expect(calcKpis(issues).completedIssues).toBe(2);
  });

  it('calculates completionRate correctly', () => {
    const issues = [
      createIssue({ statusGroup: '完了' }),
      createIssue({ statusGroup: '入力中' }),
      createIssue({ statusGroup: '完了' }),
      createIssue({ statusGroup: '未着手' }),
    ];
    expect(calcKpis(issues).completionRate).toBe(50);
  });

  it('handles empty array (0 total, 0%)', () => {
    const kpis = calcKpis([]);
    expect(kpis.totalIssues).toBe(0);
    expect(kpis.completedIssues).toBe(0);
    expect(kpis.completionRate).toBe(0);
  });

  it('counts todayDeadlineCount correctly', () => {
    const issues = [
      createIssue({ deadlineFinal: '2025-06-15', statusGroup: '入力中' }),
      createIssue({ deadlineFinal: '2025-06-15', statusGroup: '未着手' }),
      createIssue({ deadlineFinal: '2025-06-15', statusGroup: '完了' }), // completed -> excluded
      createIssue({ deadlineFinal: '2025-06-16', statusGroup: '入力中' }), // different date
      createIssue({ deadlineFinal: '', statusGroup: '入力中' }), // no deadline
    ];
    expect(calcKpis(issues).todayDeadlineCount).toBe(2);
  });
});

// ---- getUniqueVcNames ----
describe('getUniqueVcNames', () => {
  it('returns unique sorted values', () => {
    const issues = [
      createIssue({ vcName: 'VC-B' }),
      createIssue({ vcName: 'VC-A' }),
      createIssue({ vcName: 'VC-B' }),
    ];
    expect(getUniqueVcNames(issues)).toEqual(['VC-A', 'VC-B']);
  });

  it('excludes empty strings', () => {
    const issues = [
      createIssue({ vcName: 'VC-A' }),
      createIssue({ vcName: '' }),
    ];
    expect(getUniqueVcNames(issues)).toEqual(['VC-A']);
  });
});

// ---- getUniqueAssignees ----
describe('getUniqueAssignees', () => {
  it('returns unique sorted values', () => {
    const issues = [
      createIssue({ assigneeInput: '担当者B', assigneeWc: '' }),
      createIssue({ assigneeInput: '担当者A', assigneeWc: '' }),
      createIssue({ assigneeInput: '担当者B', assigneeWc: '' }),
    ];
    expect(getUniqueAssignees(issues)).toEqual(['担当者A', '担当者B']);
  });

  it('includes both assigneeInput and assigneeWc', () => {
    const issues = [
      createIssue({ assigneeInput: '担当者A', assigneeWc: '担当者B' }),
    ];
    expect(getUniqueAssignees(issues)).toEqual(['担当者A', '担当者B']);
  });

  it('excludes empty strings', () => {
    const issues = [
      createIssue({ assigneeInput: '', assigneeWc: '' }),
      createIssue({ assigneeInput: '担当者A', assigneeWc: '' }),
    ];
    expect(getUniqueAssignees(issues)).toEqual(['担当者A']);
  });
});

// ---- getUniqueYearMonths ----
describe('getUniqueYearMonths', () => {
  it('returns unique sorted values (descending)', () => {
    const issues = [
      createIssue({ yearMonth: '2025/01' }),
      createIssue({ yearMonth: '2025/03' }),
      createIssue({ yearMonth: '2025/02' }),
      createIssue({ yearMonth: '2025/03' }),
    ];
    expect(getUniqueYearMonths(issues)).toEqual(['2025/03', '2025/02', '2025/01']);
  });

  it('excludes empty strings', () => {
    const issues = [
      createIssue({ yearMonth: '2025/03' }),
      createIssue({ yearMonth: '' }),
    ];
    expect(getUniqueYearMonths(issues)).toEqual(['2025/03']);
  });
});
