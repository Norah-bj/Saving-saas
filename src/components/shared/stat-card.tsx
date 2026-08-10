import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down"; label?: string };
  description?: string;
  sparkline?: number[];
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  description,
  sparkline,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
              <Icon className="size-4.5" />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          {sparkline && sparkline.length > 1 && (
            <Sparkline
              data={sparkline}
              className="mb-0.5 h-8 w-16 shrink-0"
              positive={trend ? trend.direction === "up" : true}
            />
          )}
        </div>
        {(trend || description) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                  trend.direction === "up"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-red-50 text-destructive dark:bg-red-950 dark:text-red-400"
                )}
              >
                {trend.direction === "up" ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {trend.value}
              </span>
            )}
            <span className="text-muted-foreground">{trend?.label ?? description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
