"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface DonutChartProps {
  data: { key: string; label: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ data, height = 220, centerLabel, centerValue }: DonutChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.key, { label: d.label, color: d.color }])
  );

  return (
    <div className="relative">
      <ChartContainer config={config} className="mx-auto aspect-square w-full" style={{ height }}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
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
  );
}
