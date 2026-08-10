import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface TrendLineChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  valueFormatter?: (v: number) => string;
  height?: number;
}

export function TrendLineChart({
  data,
  xKey,
  series,
  valueFormatter,
  height = 260,
}: TrendLineChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }])
  );

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.28} />
              <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={11}
          tickFormatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
          width={56}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              formatter={
                valueFormatter
                  ? (value) => valueFormatter(Number(value))
                  : undefined
              }
            />
          }
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2.25}
            fill={`url(#fill-${s.key})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
