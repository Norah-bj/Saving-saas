import { Building2, Users, CreditCard, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { usePlatformOrganizations } from "@/lib/api/platform-organizations";
import { formatRwf } from "@/lib/format";
import { planPriceRwf } from "@/lib/plans";

function organizationGrowthByYear(createdAtList: string[]) {
  if (createdAtList.length === 0) return [];
  const years = createdAtList.map((d) => new Date(d).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = new Date().getFullYear();
  const result: { year: string; organizations: number }[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const previous = result.length > 0 ? result[result.length - 1].organizations : 0;
    result.push({ year: String(y), organizations: previous + years.filter((yr) => yr === y).length });
  }
  return result;
}

export default function SuperAdminDashboardPage() {
  // Real platform data — the same GET /organizations response Organizations
  // and Analytics use; every figure below is derived from it client-side.
  const { data: organizations = [], isLoading, isError } = usePlatformOrganizations();

  const totalMembers = organizations.reduce((sum, o) => sum + o.memberCount, 0);
  const totalMrr = organizations.reduce((sum, o) => sum + planPriceRwf(o.plan), 0);
  const activeOrgs = organizations.filter((o) => o.status === "active").length;

  const growthSeries = organizationGrowthByYear(organizations.map((o) => o.createdAt));
  const firstYear = growthSeries[0]?.year;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A bird&apos;s-eye view of every organization running on IkiminaConnect.
        </p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Couldn&apos;t load organizations. Refresh to try again.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Organizations"
          value={isLoading ? "…" : String(organizations.length)}
          icon={Building2}
          description="Tenants on the platform"
        />
        <StatCard
          label="Total Members"
          value={isLoading ? "…" : String(totalMembers)}
          icon={Users}
          description="Across all organizations"
        />
        <StatCard
          label="Plan Value (MRR)"
          value={isLoading ? "…" : formatRwf(totalMrr)}
          icon={CreditCard}
          description="Sum of list prices — no billing system yet"
        />
        <StatCard
          label="Active Organizations"
          value={isLoading ? "…" : String(activeOrgs)}
          icon={CheckCircle2}
          description={`Of ${organizations.length} total`}
        />
      </div>

      <ChartCard
        title="Platform Growth"
        description={firstYear ? `Cumulative organizations onboarded since ${firstYear}` : "No organizations yet"}
      >
        <TrendLineChart
          data={growthSeries}
          xKey="year"
          series={[{ key: "organizations", label: "Organizations", color: "var(--chart-1)" }]}
        />
      </ChartCard>
    </div>
  );
}
