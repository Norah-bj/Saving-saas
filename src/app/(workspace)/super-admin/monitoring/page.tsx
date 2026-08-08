"use client";

import { Activity, Clock, Database, ListChecks, Server } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { formatNumber } from "@/lib/format";

const SYSTEM_HEALTH = {
  apiUptimePct: 99.97,
  avgResponseMs: 148,
  requestsLast24h: 214830,
  databaseSizeGb: 6.4,
  jobQueueDepth: 12,
};

const UPTIME_SERIES = [
  { day: "Jul 26", uptime: 99.92 },
  { day: "Jul 27", uptime: 99.98 },
  { day: "Jul 28", uptime: 100 },
  { day: "Jul 29", uptime: 99.95 },
  { day: "Jul 30", uptime: 99.89 },
  { day: "Jul 31", uptime: 99.99 },
  { day: "Aug 01", uptime: 100 },
  { day: "Aug 02", uptime: 99.97 },
  { day: "Aug 03", uptime: 99.86 },
  { day: "Aug 04", uptime: 99.94 },
  { day: "Aug 05", uptime: 100 },
  { day: "Aug 06", uptime: 99.98 },
  { day: "Aug 07", uptime: 99.91 },
  { day: "Aug 08", uptime: 99.97 },
];

export default function SuperAdminMonitoringPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">System Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Live health of the IkiminaConnect platform infrastructure.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="API Uptime"
          value={`${SYSTEM_HEALTH.apiUptimePct}%`}
          icon={Activity}
          description="Last 30 days"
        />
        <StatCard
          label="Avg Response Time"
          value={`${SYSTEM_HEALTH.avgResponseMs} ms`}
          icon={Clock}
          description="Rolling 5-minute average"
        />
        <StatCard
          label="Requests (24h)"
          value={formatNumber(SYSTEM_HEALTH.requestsLast24h)}
          icon={Server}
          description="Across all organizations"
        />
        <StatCard
          label="Database Size"
          value={`${SYSTEM_HEALTH.databaseSizeGb} GB`}
          icon={Database}
          description="Primary production instance"
        />
        <StatCard
          label="Job Queue Depth"
          value={String(SYSTEM_HEALTH.jobQueueDepth)}
          icon={ListChecks}
          description="Background jobs pending"
        />
      </div>

      <ChartCard title="API Uptime" description="Daily uptime percentage over the last 14 days">
        <TrendLineChart
          data={UPTIME_SERIES}
          xKey="day"
          series={[{ key: "uptime", label: "Uptime %", color: "var(--chart-1)" }]}
          valueFormatter={(v) => `${v.toFixed(2)}%`}
        />
      </ChartCard>
    </div>
  );
}
