import { fetchDashboardData } from '@/lib/sheets-client';
import { ForecastGrid } from '@/components/forecast-grid';
import { ForecastRowExtended } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  const data = await fetchDashboardData();
  const forecasts = data.forecasts as ForecastRowExtended[];
  const sheetId = 962931220;

  const allVcNames = Array.from(new Set([
    ...data.issues.map(i => i.vcName),
    ...forecasts.map(f => f.vcName),
  ])).filter(Boolean).sort();

  const existingVcProfiles: Record<string, ForecastRowExtended> = {};
  for (const f of forecasts) {
    if (!existingVcProfiles[f.vcName]) {
      existingVcProfiles[f.vcName] = f;
    }
  }

  // サマリー統計
  const totalClients = new Set(forecasts.map(f => f.vcName)).size;
  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const thisMonthTotal = forecasts
    .filter(f => f.yearMonth === currentMonth)
    .reduce((sum, f) => sum + f.forecastCount, 0);
  const regularClients = new Set(
    forecasts.filter(f => f.frequency === 'regular').map(f => f.vcName)
  ).size;

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">登録クライアント数</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{totalClients}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            うち定期: {regularClients}件
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-100/50" />
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">今月の予測件数</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">{thisMonthTotal}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {currentMonth}
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-100/50" />
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">カテゴリ数</div>
          <div className="mt-1 text-3xl font-bold tracking-tight">
            {new Set(forecasts.map(f => f.category)).size}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            アクティブカテゴリ
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-100/50" />
        </div>
      </div>

      {/* グリッド */}
      <ForecastGrid
        initialForecasts={forecasts}
        sheetId={sheetId}
        knownVcNames={allVcNames}
        existingVcProfiles={existingVcProfiles}
      />
    </div>
  );
}
