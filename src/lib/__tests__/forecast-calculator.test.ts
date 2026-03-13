import { describe, it, expect } from 'vitest';
import {
  calcWeightedEffort,
  calcMonthlyEffort,
  calcCategoryMonthlyTotals,
  calcMonthlyTotals,
  calcCategorySubtotals,
} from '../forecast-calculator';
import { ForecastRowExtended } from '../types';

// ヘルパー: テスト用 ForecastRowExtended を生成
function makeForecast(overrides: Partial<ForecastRowExtended> = {}): ForecastRowExtended {
  return {
    vcName: 'TestVC',
    yearMonth: '2025/04',
    forecastCount: 10,
    notes: '',
    category: '新規VC',
    frequency: 'one-time',
    intervalMonths: null,
    startMonth: null,
    deadlineDay: null,
    assignDeadlineDay: null,
    ...overrides,
  };
}

describe('calcWeightedEffort', () => {
  it('新規VC の工数係数 1.5 が適用される', () => {
    const f = makeForecast({ forecastCount: 10, category: '新規VC' });
    expect(calcWeightedEffort(f)).toBe(15);
  });

  it('SU の工数係数 1.0 が適用される', () => {
    const f = makeForecast({ forecastCount: 10, category: 'SU' });
    expect(calcWeightedEffort(f)).toBe(10);
  });

  it('継続月次 の工数係数 0.8 が適用される', () => {
    const f = makeForecast({ forecastCount: 10, category: '継続月次' });
    expect(calcWeightedEffort(f)).toBe(8);
  });

  it('forecastCount が 0 の場合は 0 を返す', () => {
    const f = makeForecast({ forecastCount: 0 });
    expect(calcWeightedEffort(f)).toBe(0);
  });
});

describe('calcMonthlyEffort', () => {
  it('月別に加重工数を集計する', () => {
    const forecasts = [
      makeForecast({ yearMonth: '2025/04', forecastCount: 10, category: '新規VC' }),
      makeForecast({ yearMonth: '2025/04', forecastCount: 5, category: 'SU' }),
      makeForecast({ yearMonth: '2025/05', forecastCount: 8, category: '継続月次' }),
    ];
    const result = calcMonthlyEffort(forecasts);
    expect(result.get('2025/04')).toBe(10 * 1.5 + 5 * 1.0); // 20
    expect(result.get('2025/05')).toBe(8 * 0.8); // 6.4
  });

  it('空配列の場合は空Map', () => {
    const result = calcMonthlyEffort([]);
    expect(result.size).toBe(0);
  });
});

describe('calcCategoryMonthlyTotals', () => {
  it('カテゴリ×月で件数を集計する', () => {
    const forecasts = [
      makeForecast({ yearMonth: '2025/04', forecastCount: 10, category: '新規VC' }),
      makeForecast({ yearMonth: '2025/04', forecastCount: 5, category: '新規VC' }),
      makeForecast({ yearMonth: '2025/04', forecastCount: 3, category: 'SU' }),
    ];
    const result = calcCategoryMonthlyTotals(forecasts);
    const april = result.get('2025/04')!;
    expect(april.get('新規VC')).toBe(15);
    expect(april.get('SU')).toBe(3);
  });
});

describe('calcMonthlyTotals', () => {
  it('月別合計件数を計算する', () => {
    const forecasts = [
      makeForecast({ yearMonth: '2025/04', forecastCount: 10 }),
      makeForecast({ yearMonth: '2025/04', forecastCount: 5 }),
      makeForecast({ yearMonth: '2025/05', forecastCount: 8 }),
    ];
    const result = calcMonthlyTotals(forecasts);
    expect(result.get('2025/04')).toBe(15);
    expect(result.get('2025/05')).toBe(8);
  });
});

describe('calcCategorySubtotals', () => {
  it('指定カテゴリのみ月別集計する', () => {
    const forecasts = [
      makeForecast({ yearMonth: '2025/04', forecastCount: 10, category: '新規VC' }),
      makeForecast({ yearMonth: '2025/04', forecastCount: 5, category: 'SU' }),
      makeForecast({ yearMonth: '2025/04', forecastCount: 3, category: '新規VC' }),
    ];
    const result = calcCategorySubtotals(forecasts, '新規VC');
    expect(result.get('2025/04')).toBe(13);
  });

  it('対象カテゴリがない場合は空Map', () => {
    const forecasts = [
      makeForecast({ yearMonth: '2025/04', category: 'SU' }),
    ];
    const result = calcCategorySubtotals(forecasts, 'LP投資管理');
    expect(result.size).toBe(0);
  });
});
