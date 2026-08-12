import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { useInView } from "@/lib/hooks/use-in-view";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { cn } from "@/lib/utils";

interface AnimatedStatCardProps {
  label: string;
  endValue: number;
  formatValue: (n: number) => string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down"; label?: string };
  sparkline?: number[];
  className?: string;
}

export function AnimatedStatCard({
  label,
  endValue,
  formatValue,
  icon,
  trend,
  sparkline,
  className,
}: AnimatedStatCardProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const value = useCountUp(endValue, { start: inView, duration: 1400 });

  return (
    <div ref={ref}>
      <StatCard
        label={label}
        value={formatValue(value)}
        icon={icon}
        trend={trend}
        sparkline={sparkline}
        className={cn("transition-shadow duration-200 hover:shadow-soft-md", className)}
      />
    </div>
  );
}
