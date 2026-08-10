import type * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  periodOptions?: string[];
  period?: string;
  onPeriodChange?: (period: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  action,
  periodOptions,
  period,
  onPeriodChange,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {periodOptions && periodOptions.length > 0 ? (
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5">
            {periodOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onPeriodChange?.(option)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  option === period
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          action
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
