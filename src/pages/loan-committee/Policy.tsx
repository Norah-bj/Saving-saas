import * as React from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpen } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIOD_CANDIDATES = [3, 6, 8, 12, 18, 24, 36];

export default function LoanCommitteePolicyPage() {
  const { user } = useCurrentUser();
  const organization = useDataStore((s) => s.organization);
  const updateOrganization = useDataStore((s) => s.updateOrganization);
  const policies = useDataStore((s) => s.policies);

  const [form, setForm] = React.useState({
    loanInterestRate: organization.loanInterestRate,
    loanInsuranceRate: organization.loanInsuranceRate,
    minMonthsBeforeEligible: organization.minMonthsBeforeEligible,
    allowedRepaymentPeriods: organization.allowedRepaymentPeriods,
  });
  const [saved, setSaved] = React.useState(false);

  const actorName = user?.fullName ?? "Loan Committee";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function togglePeriod(period: number) {
    set(
      "allowedRepaymentPeriods",
      form.allowedRepaymentPeriods.includes(period)
        ? form.allowedRepaymentPeriods.filter((p) => p !== period)
        : [...form.allowedRepaymentPeriods, period].sort((a, b) => a - b)
    );
  }

  function handleSave() {
    if (form.allowedRepaymentPeriods.length === 0) return;
    updateOrganization(form, actorName);
    setSaved(true);
  }

  const relevant = policies
    .filter((p) => p.category === "loan" || p.category === "guarantor")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Loan Policy</h1>
        <p className="text-sm text-muted-foreground">
          Configure the interest, insurance, and eligibility rules the loan calculator applies
          organization-wide, plus reference rules for committee decisions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Loan Calculation Settings</CardTitle>
          <CardDescription>
            These values drive every loan application and calculation for {organization.shortName}.
            Existing loans keep the rate that applied when they were approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interest-rate">Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                min={0}
                step={0.5}
                value={form.loanInterestRate}
                onChange={(e) => set("loanInterestRate", e.target.valueAsNumber || 0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="insurance-rate">Insurance Rate (%)</Label>
              <Input
                id="insurance-rate"
                type="number"
                min={0}
                step={0.5}
                value={form.loanInsuranceRate}
                onChange={(e) => set("loanInsuranceRate", e.target.valueAsNumber || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Only charged when the loan exceeds the member&apos;s savings.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min-months">Minimum Months Before Eligible</Label>
              <Input
                id="min-months"
                type="number"
                min={0}
                step={1}
                value={form.minMonthsBeforeEligible}
                onChange={(e) => set("minMonthsBeforeEligible", e.target.valueAsNumber || 0)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Allowed Repayment Periods (months)</Label>
            <div className="flex flex-wrap gap-1.5">
              {PERIOD_CANDIDATES.map((period) => {
                const selected = form.allowedRepaymentPeriods.includes(period);
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => togglePeriod(period)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
            {form.allowedRepaymentPeriods.length === 0 && (
              <p className="text-xs text-destructive">Select at least one repayment period.</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSave} disabled={form.allowedRepaymentPeriods.length === 0}>
              <Save className="size-4" /> Save Changes
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {relevant.length === 0 ? (
        <EmptyState icon={BookOpen} title="No loan policies on file" />
      ) : (
        <div className="flex flex-col gap-4">
          {relevant.map((policy) => (
            <Card key={policy.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{policy.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">{policy.category}</Badge>
                </div>
                <CardDescription>{policy.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {policy.body.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Last updated {formatDate(policy.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
