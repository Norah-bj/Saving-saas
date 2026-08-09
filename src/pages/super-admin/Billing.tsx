import { CheckCircle2, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatRwf, formatNumber } from "@/lib/format";
import { SUBSCRIPTION_PLANS } from "@/lib/mock-data";
import type { Organization } from "@/lib/types";

function planPrice(plan: string) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === `plan-${plan}`)?.priceMonthlyRwf ?? 0;
}

function planIdToKey(planId: string): Organization["plan"] {
  return planId.replace("plan-", "") as Organization["plan"];
}

export default function SuperAdminBillingPage() {
  const { user } = useCurrentUser();
  const organizations = useDataStore((s) => s.organizations);
  const setOrganizationPlan = useDataStore((s) => s.setOrganizationPlan);

  const actorName = user?.fullName ?? "Super Admin";
  const totalMrr = organizations.reduce((sum, o) => sum + planPrice(o.plan), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Subscriptions & Billing</h1>
        <p className="text-sm text-muted-foreground">
          Plan tiers available on the platform and each organization&apos;s current subscription.
        </p>
      </div>

      <StatCard
        label="Total Monthly Recurring Revenue"
        value={formatRwf(totalMrr)}
        icon={CreditCard}
        description={`Across ${organizations.length} organizations`}
        className="max-w-xs"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
              <CardDescription>
                {formatRwf(plan.priceMonthlyRwf)}/month · up to {formatNumber(plan.maxMembers)} members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Organization", cell: (r) => r.name },
              { header: "Current Plan", cell: (r) => formatRwf(planPrice(r.plan)) + "/mo" },
              {
                header: "Change Plan",
                cell: (r) => (
                  <Select
                    value={r.plan}
                    onValueChange={(v) => setOrganizationPlan(r.id, (v ?? r.plan) as Organization["plan"], actorName)}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_PLANS.map((plan) => (
                        <SelectItem key={plan.id} value={planIdToKey(plan.id)}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
            ]}
            rows={organizations}
            rowKey={(r) => r.id}
            emptyMessage="No organizations found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
