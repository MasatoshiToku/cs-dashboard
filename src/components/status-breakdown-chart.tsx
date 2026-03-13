"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { StatusBreakdown } from "@/lib/types";
import { STATUS_GROUPS, STATUS_GROUP_COLORS } from "@/lib/constants";

interface StatusBreakdownChartProps {
  data: StatusBreakdown[];
}

interface ChartRow {
  vcName: string;
  未着手: number;
  入力中: number;
  WC中: number;
  完了: number;
  raw未着手: number;
  raw入力中: number;
  rawWC中: number;
  raw完了: number;
  total: number;
}

function toChartData(data: StatusBreakdown[]): ChartRow[] {
  return data.map((d) => ({
    vcName: d.vcName,
    未着手: d.total > 0 ? (d.未着手 / d.total) * 100 : 0,
    入力中: d.total > 0 ? (d.入力中 / d.total) * 100 : 0,
    WC中: d.total > 0 ? (d.WC中 / d.total) * 100 : 0,
    完了: d.total > 0 ? (d.完了 / d.total) * 100 : 0,
    raw未着手: d.未着手,
    raw入力中: d.入力中,
    rawWC中: d.WC中,
    raw完了: d.完了,
    total: d.total,
  }));
}

// Custom tooltip showing count and percentage per status group
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: ChartRow }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-semibold mb-1">{label} (合計: {row.total}件)</p>
      {STATUS_GROUPS.map((group) => {
        const rawKey = `raw${group}` as keyof ChartRow;
        const count = row[rawKey] as number;
        const pct = row[group as keyof ChartRow] as number;
        return (
          <div key={group} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: STATUS_GROUP_COLORS[group] }}
            />
            <span>
              {group}: {count}件 ({pct.toFixed(1)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Render count label on segment if wide enough
function renderBarLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  name?: string;
  index?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  // Only show label if segment is wide enough (> 30px)
  if (width < 30 || value === 0) return <text />;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={12}
      fontWeight={500}
    >
      {value.toFixed(0)}%
    </text>
  );
}

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const chartData = toChartData(data);
  const barHeight = Math.max(chartData.length * 48, 200);

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">VC別ステータス内訳</h3>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="vcName" width={120} tick={{ fontSize: 13 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {STATUS_GROUPS.map((group) => (
            <Bar
              key={group}
              dataKey={group}
              stackId="status"
              fill={STATUS_GROUP_COLORS[group]}
              label={renderBarLabel}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
