import { Building2, Users, CreditCard, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf } from "@/lib/format";
import { SUBSCRIPTION_PLANS, MOCK_TODAY } from "@/lib/mock-data";

function planPrice(plan: string) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === `plan-${plan}`)?.priceMonthlyRwf ?? 0;
}

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

export default function SuperAdminDashboardPage() {
  const organizations = useDataStore((s) => s.organizations);

  const totalMembers = organizations.reduce((sum, o) => sum + o.memberCount, 0);
  const totalMrr = organizations.reduce((sum, o) => sum + planPrice(o.plan), 0);
  const activeOrgs = organizations.filter((o) => o.status === "active").length;

  const growthSeries = organizationGrowthByYear(organizations.map((o) => o.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A bird&apos;s-eye view of every organization running on IkiminaConnect.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Organizations"
          value={String(organizations.length)}
          icon={Building2}
          description="Tenants on the platform"
        />
        <StatCard
          label="Total Members"
          value={String(totalMembers)}
          icon={Users}
          description="Across all organizations"
        />
        <StatCard
          label="Total MRR"
          value={formatRwf(totalMrr)}
          icon={CreditCard}
          description="Monthly recurring revenue"
        />
        <StatCard
          label="Active Organizations"
          value={String(activeOrgs)}
          icon={CheckCircle2}
          description={`Of ${organizations.length} total`}
        />
      </div>

      <ChartCard title="Platform Growth" description="Cumulative organizations onboarded since 2020">
        <TrendLineChart
          data={growthSeries}
          xKey="year"
          series={[{ key: "organizations", label: "Organizations", color: "var(--chart-1)" }]}
        />
      </ChartCard>
    </div>
  );
}
