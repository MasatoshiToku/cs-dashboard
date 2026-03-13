'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { VcProgress } from '@/lib/types';

interface VcProgressChartProps {
  data: VcProgress[];
}

// Achievement rate color based on threshold
function rateColor(rate: number): string {
  if (rate >= 100) return '#22c55e'; // green-500
  if (rate >= 80) return '#eab308';  // yellow-500
  return '#ef4444';                   // red-500
}

// Custom label renderer for achievement rate on top of bar groups
function AchievementLabel(props: Record<string, unknown>) {
  const { x, y, width, value, index } = props as {
    x: number;
    y: number;
    width: number;
    value: number;
    index: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  // Only render on the "actual" bar (second bar in group)
  if (value === undefined || index === undefined) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fontSize={12}
      fontWeight={600}
      fill={rateColor(value)}
    >
      {value.toFixed(0)}%
    </text>
  );
}

// Custom tooltip content
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: VcProgress & { label: string; displayRate: number } }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-muted-foreground">
        予測: <span className="font-medium text-foreground">{row.forecast}</span>
      </p>
      <p className="text-muted-foreground">
        実績: <span className="font-medium text-foreground">{row.actual}</span>
      </p>
      <p style={{ color: rateColor(row.achievementRate) }}>
        達成率: {row.achievementRate.toFixed(1)}%
      </p>
    </div>
  );
}

export function VcProgressChart({ data }: VcProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        VC進捗データがありません
      </div>
    );
  }

  // Determine if multiple months exist to decide label format
  const uniqueMonths = new Set(data.map(d => d.yearMonth));
  const chartData = data.map(d => ({
    ...d,
    label: uniqueMonths.size > 1 ? `${d.vcName} (${d.yearMonth})` : d.vcName,
    displayRate: d.achievementRate,
  }));

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">VC別 予測 vs 実績</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 24, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={data.length > 6 ? -30 : 0}
            textAnchor={data.length > 6 ? 'end' : 'middle'}
            height={data.length > 6 ? 80 : 40}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (value === 'forecast' ? '予測' : '実績')}
          />
          <Bar dataKey="forecast" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" fill="#34d399" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="displayRate" content={<AchievementLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
