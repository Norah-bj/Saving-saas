import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Series } from "./trend-line-chart";

interface BarComparisonChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  valueFormatter?: (v: number) => string;
  height?: number;
  stacked?: boolean;
}

export function BarComparisonChart({
  data,
  xKey,
  series,
  valueFormatter,
  height = 260,
  stacked = false,
}: BarComparisonChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }])
  );

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }} barCategoryGap={stacked ? "20%" : "28%"} barGap={4}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={11}
          tickFormatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
          width={56}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              formatter={valueFormatter ? (value) => valueFormatter(Number(value)) : undefined}
            />
          }
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            radius={stacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            maxBarSize={40}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
