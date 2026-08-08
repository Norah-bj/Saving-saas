import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down"; label?: string };
  description?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, description, className }: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
          )}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        {(trend || description) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trend.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
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
