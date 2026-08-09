import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
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
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
