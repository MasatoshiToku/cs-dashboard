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
  const totalClients = Array.from(new Set(forecasts.map(f => f.vcName))).length;
  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const thisMonthTotal = forecasts
    .filter(f => f.yearMonth === currentMonth)
    .reduce((sum, f) => sum + f.forecastCount, 0);
  const regularClients = Array.from(new Set(
    forecasts.filter(f => f.frequency === 'regular').map(f => f.vcName)
  )).length;

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 登録クライアント数 */}
        <div className="group relative overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/80 via-white to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-200/80">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              登録クライアント
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-blue-950">{totalClients}</div>
            <div className="mt-1.5 text-sm text-blue-600/60">うち定期 {regularClients} 件</div>
          </div>
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-200/20 transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-blue-200/15" />
        </div>

        {/* 今月の予測件数 */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-200/80">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              今月の予測件数
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-emerald-950">{thisMonthTotal}</div>
            <div className="mt-1.5 text-sm text-emerald-600/60">{currentMonth}</div>
          </div>
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/20 transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-emerald-200/15" />
        </div>

        {/* カテゴリ数 */}
        <div className="group relative overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 via-white to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-violet-200/80">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-violet-600/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              カテゴリ
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-violet-950">
              {Array.from(new Set(forecasts.map(f => f.category))).length || 0}
            </div>
            <div className="mt-1.5 text-sm text-violet-600/60">アクティブカテゴリ</div>
          </div>
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-violet-200/20 transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-violet-200/15" />
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
