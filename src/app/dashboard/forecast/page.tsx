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
    <div className="space-y-8">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 登録クライアント数 */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(59,130,246,0.08)] hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              <div className="h-1 w-1 rounded-full bg-blue-500" />
              Clients
            </div>
            <div className="mt-4 text-5xl font-extrabold tracking-tighter bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent">{totalClients}</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
              <span>定期</span>
              <span className="font-semibold text-gray-600">{regularClients}</span>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-100/40 to-blue-50/20 transition-transform duration-700 group-hover:scale-150" />
        </div>

        {/* 今月の予測件数 */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(16,185,129,0.08)] hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
              <div className="h-1 w-1 rounded-full bg-emerald-500" />
              This Month
            </div>
            <div className="mt-4 text-5xl font-extrabold tracking-tighter bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent">{thisMonthTotal}</div>
            <div className="mt-2 text-sm text-gray-400">{currentMonth}</div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-100/40 to-emerald-50/20 transition-transform duration-700 group-hover:scale-150" />
        </div>

        {/* カテゴリ */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_40px_rgba(139,92,246,0.08)] hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-600">
              <div className="h-1 w-1 rounded-full bg-violet-500" />
              Categories
            </div>
            <div className="mt-4 text-5xl font-extrabold tracking-tighter bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent">
              {Array.from(new Set(forecasts.map(f => f.category))).length || 0}
            </div>
            <div className="mt-2 text-sm text-gray-400">アクティブ</div>
          </div>
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-violet-100/40 to-violet-50/20 transition-transform duration-700 group-hover:scale-150" />
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
