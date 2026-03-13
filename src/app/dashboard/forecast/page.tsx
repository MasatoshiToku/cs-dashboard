import { fetchDashboardData } from '@/lib/sheets-client';
import { ForecastGrid } from '@/components/forecast-grid';
import { ForecastRowExtended } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  const data = await fetchDashboardData();

  // forecasts は ForecastRow[] だが実際には ForecastRowExtended[] として返される
  const forecasts = data.forecasts as ForecastRowExtended[];

  // forecasts シートの sheetId (gid)

  const sheetId = 962931220;

  // issues + forecasts から一意な VC 名リストを作成（ルックアップ候補）
  const issueVcNames = data.issues.map(i => i.vcName).filter(Boolean);
  const forecastVcNames = forecasts.map(f => f.vcName).filter(Boolean);
  const allVcNames = Array.from(new Set([...issueVcNames, ...forecastVcNames])).sort((a, b) => a.localeCompare(b, 'ja'));

  // forecasts にある VC のプロファイル（category/frequency/intervalMonths 等の自動入力用）
  const existingVcProfiles: Record<string, ForecastRowExtended> = {};
  for (const f of forecasts) {
    if (f.vcName && !existingVcProfiles[f.vcName]) {
      existingVcProfiles[f.vcName] = f;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>予測件数管理</CardTitle>
          <CardDescription>
            クライアント別・月別の予測入力件数を管理します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastGrid
            initialForecasts={forecasts}
            sheetId={sheetId}
            knownVcNames={allVcNames}
            existingVcProfiles={existingVcProfiles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
