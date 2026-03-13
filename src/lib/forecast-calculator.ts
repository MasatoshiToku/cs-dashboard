import { ForecastRowExtended, ForecastCategory } from './types';
import { FORECAST_EFFORT_COEFFICIENTS } from './constants';

/**
 * 予測件数にカテゴリ別工数係数を掛けて、加重工数を計算
 */
export function calcWeightedEffort(forecast: ForecastRowExtended): number {
  const coefficient = FORECAST_EFFORT_COEFFICIENTS[forecast.category] ?? 1.0;
  return forecast.forecastCount * coefficient;
}

/**
 * 月別の合計加重工数を計算
 */
export function calcMonthlyEffort(
  forecasts: ForecastRowExtended[]
): Map<string, number> {
  const result = new Map<string, number>();
  for (const f of forecasts) {
    const current = result.get(f.yearMonth) ?? 0;
    result.set(f.yearMonth, current + calcWeightedEffort(f));
  }
  return result;
}

/**
 * カテゴリ別の月別合計件数
 */
export function calcCategoryMonthlyTotals(
  forecasts: ForecastRowExtended[]
): Map<string, Map<ForecastCategory, number>> {
  // key: yearMonth, value: Map<category, total forecastCount>
  const result = new Map<string, Map<ForecastCategory, number>>();
  for (const f of forecasts) {
    if (!result.has(f.yearMonth)) {
      result.set(f.yearMonth, new Map());
    }
    const monthMap = result.get(f.yearMonth)!;
    const current = monthMap.get(f.category) ?? 0;
    monthMap.set(f.category, current + f.forecastCount);
  }
  return result;
}

/**
 * 全カテゴリの月別合計件数（サマリー行用）
 */
export function calcMonthlyTotals(
  forecasts: ForecastRowExtended[]
): Map<string, number> {
  const result = new Map<string, number>();
  for (const f of forecasts) {
    const current = result.get(f.yearMonth) ?? 0;
    result.set(f.yearMonth, current + f.forecastCount);
  }
  return result;
}

/**
 * 特定カテゴリの月別合計件数（小計行用）
 */
export function calcCategorySubtotals(
  forecasts: ForecastRowExtended[],
  category: ForecastCategory
): Map<string, number> {
  const filtered = forecasts.filter(f => f.category === category);
  const result = new Map<string, number>();
  for (const f of filtered) {
    const current = result.get(f.yearMonth) ?? 0;
    result.set(f.yearMonth, current + f.forecastCount);
  }
  return result;
}
