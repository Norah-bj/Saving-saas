import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  positive?: boolean;
  className?: string;
}

export function Sparkline({ data, positive = true, className }: SparklineProps) {
  const points = data.map((value, i) => ({ i, value }));
  const color = positive ? "var(--chart-1)" : "var(--destructive)";
  const gradientId = `sparkline-${positive ? "up" : "down"}`;

  return (
    <div className={cn("h-8 w-16", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
