import { fetchDashboardData } from '@/lib/sheets-client';
import { ForecastGrid } from '@/components/forecast-grid';
import { ForecastRowExtended } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  const data = await fetchDashboardData();

  // forecasts は ForecastRow[] だが実際には ForecastRowExtended[] として返される
  const forecasts = data.forecasts as ForecastRowExtended[];

  // TODO: sheetId は forecasts シートの gid。スプレッドシートの構造から取得
  // 暫定的に 0 を設定（実際の値はスプレッドシートで確認が必要）
  const sheetId = 0;

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
          />
        </CardContent>
      </Card>
    </div>
  );
}
