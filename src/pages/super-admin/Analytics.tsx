import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { useDataStore } from "@/lib/store/data-store";
import { MOCK_TODAY } from "@/lib/mock-data";
import type { Organization } from "@/lib/types";

function organizationGrowthByYear(createdAtList: string[]) {
  if (createdAtList.length === 0) return [];
  const years = createdAtList.map((d) => new Date(d).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = new Date(MOCK_TODAY).getFullYear();
  const result: { year: string; organizations: number }[] = [];
  let cumulative = 0;
  for (let y = minYear; y <= maxYear; y++) {
    cumulative += years.filter((yr) => yr === y).length;
    result.push({ year: String(y), organizations: cumulative });
  }
  return result;
}

const PLAN_COLOR: Record<Organization["plan"], string> = {
  starter: "var(--chart-3)",
  growth: "var(--chart-2)",
  enterprise: "var(--chart-1)",
};

const PLAN_LABEL: Record<Organization["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

export default function SuperAdminAnalyticsPage() {
  const organizations = useDataStore((s) => s.organizations);

  const growthSeries = organizationGrowthByYear(organizations.map((o) => o.createdAt));

  const planCounts: Record<Organization["plan"], number> = { starter: 0, growth: 0, enterprise: 0 };
  for (const org of organizations) planCounts[org.plan] += 1;
  const planData = (Object.keys(planCounts) as Organization["plan"][])
    .filter((plan) => planCounts[plan] > 0)
    .map((plan) => ({ key: plan, label: PLAN_LABEL[plan], value: planCounts[plan], color: PLAN_COLOR[plan] }));

  const membersData = organizations.map((o) => ({ org: o.shortName, members: o.memberCount }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Growth, plan mix and member distribution across all organizations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Platform Growth" description="Cumulative organizations onboarded since 2020">
          <TrendLineChart
            data={growthSeries}
            xKey="year"
            series={[{ key: "organizations", label: "Organizations", color: "var(--chart-1)" }]}
          />
        </ChartCard>
        <ChartCard title="Plan Distribution" description="Organizations by subscription tier">
          <DonutChart data={planData} centerValue={String(organizations.length)} centerLabel="Organizations" />
        </ChartCard>
      </div>

      <ChartCard title="Members per Organization" description="Registered members by cooperative">
        <BarComparisonChart
          data={membersData}
          xKey="org"
          series={[{ key: "members", label: "Members", color: "var(--chart-2)" }]}
        />
      </ChartCard>
    </div>
  );
}
