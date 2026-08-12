import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface DonutChartProps {
  data: { key: string; label: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (v: number) => string;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  height = 190,
  centerLabel,
  centerValue,
  valueFormatter,
  showLegend = true,
}: DonutChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.key, { label: d.label, color: d.color }])
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <ChartContainer config={config} className="mx-auto aspect-square w-full" style={{ height }}>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={valueFormatter ? (value) => valueFormatter(Number(value)) : undefined}
                />
              }
            />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="65%" outerRadius="100%" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {centerValue && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold">{centerValue}</span>
            {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>
      {showLegend && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {data.map((d) => (
            <li key={d.key} className={cn("flex items-center justify-between gap-2")}>
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="shrink-0 font-medium">
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
