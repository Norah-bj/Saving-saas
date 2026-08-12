import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldAlert, ShieldCheck, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/shared/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { useDataStore } from "@/lib/store/data-store";
import { calculateLoan } from "@/lib/loan-calculator";
import { monthsBetween, MOCK_TODAY } from "@/lib/mock-data";
import { formatRwf } from "@/lib/format";

const schema = z.object({
  amount: z.number().min(50000, "Minimum loan amount is 50,000 RWF"),
  purpose: z.string().min(4, "Please describe the purpose of this loan"),
  periodMonths: z.number().min(1),
  guarantorId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ApplyForLoanPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const organization = useDataStore((s) => s.organization);
  const savingsBalance = useDataStore((s) => s.savingsBalance);
  const members = useDataStore((s) => s.members);
  const applyForLoan = useDataStore((s) => s.applyForLoan);

  const periodOptions = organization.allowedRepaymentPeriods;
  const defaultPeriod = periodOptions.includes(12) ? 12 : periodOptions[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 500000, purpose: "", periodMonths: defaultPeriod, guarantorId: undefined },
  });

  const amount = form.watch("amount") || 0;
  const periodMonths = form.watch("periodMonths") || defaultPeriod;
  const guarantorId = form.watch("guarantorId");

  if (!user) return null;

  const savings = savingsBalance(user.id);
  const tenureMonths = monthsBetween(user.dateJoined, MOCK_TODAY);
  const eligible = tenureMonths >= organization.minMonthsBeforeEligible;
  const calc = calculateLoan(amount, savings, periodMonths, {
    interestRate: organization.loanInterestRate / 100,
    insuranceRate: organization.loanInsuranceRate / 100,
  });

  const potentialGuarantors = members.filter(
    (m) => m.organizationId === user.organizationId && m.id !== user.id && m.status === "active"
  );

  function onSubmit(values: FormValues) {
    if (calc.guarantorRequired && !values.guarantorId) {
      form.setError("guarantorId", {
        message: "A guarantor is required because this amount exceeds your savings.",
      });
      return;
    }
    const loan = applyForLoan(user!.id, {
      amount: values.amount,
      purpose: values.purpose,
      periodMonths: values.periodMonths,
      guarantorId: values.guarantorId,
    });
    navigate(`/member/loans/${loan.id}`);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Apply for a Loan</h1>
        <p className="text-sm text-muted-foreground">
          Interest is a flat {organization.loanInterestRate}% of the loan amount. A{" "}
          {organization.loanInsuranceRate}% insurance fee only applies when the amount you
          request exceeds your total savings — that&apos;s exactly when a guarantor is required.
        </p>
      </div>

      {!eligible && (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Not yet eligible</AlertTitle>
          <AlertDescription>
            Members become eligible for a loan after {organization.minMonthsBeforeEligible} months
            of continuous savings. You&apos;ve been saving for {tenureMonths} month(s). You may
            still preview the calculator below.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription>Your current savings balance: {formatRwf(savings)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested amount (RWF)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={1000}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan purpose</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="e.g. Home renovation, school fees, business stock..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repayment period</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periodOptions.map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {m} months
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {calc.guarantorRequired && (
                  <FormField
                    control={form.control}
                    name="guarantorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guarantor</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a guarantor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {potentialGuarantors.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.fullName} — {m.department}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="mt-2 w-fit">
                  Submit Application
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Loan Calculator</CardTitle>
            <CardDescription>Live estimate based on your inputs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                calc.guarantorRequired
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {calc.guarantorRequired ? <ShieldAlert className="mt-0.5 size-4 shrink-0" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0" />}
              <span>
                {calc.guarantorRequired
                  ? `This amount exceeds your savings, so a guarantor and a ${organization.loanInsuranceRate}% insurance fee are required.`
                  : "This amount is within your savings — no guarantor or insurance fee required."}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Principal</dt>
              <dd className="text-right font-medium">{formatRwf(calc.amount)}</dd>
              <dt className="text-muted-foreground">Interest ({organization.loanInterestRate}%)</dt>
              <dd className="text-right font-medium">{formatRwf(calc.interest)}</dd>
              <dt className="text-muted-foreground">Insurance ({organization.loanInsuranceRate}%)</dt>
              <dd className="text-right font-medium">{formatRwf(calc.insuranceFee)}</dd>
              <dt className="border-t pt-2 font-medium">Total Payable</dt>
              <dd className="border-t pt-2 text-right font-semibold">{formatRwf(calc.totalPayable)}</dd>
              <dt className="text-muted-foreground">Monthly Installment</dt>
              <dd className="text-right font-semibold text-primary">{formatRwf(calc.monthlyInstallment)}</dd>
            </dl>

            {guarantorId && (
              <div className="flex items-center gap-2 rounded-lg border p-2 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                Guarantor will be notified and must accept before this application proceeds.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Repayment Simulation</CardTitle>
          <CardDescription>Monthly breakdown deducted automatically from salary</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Month", cell: (r) => r.month },
              { header: "Principal", cell: (r) => formatRwf(r.principal) },
              { header: "Interest & Insurance", cell: (r) => formatRwf(r.interest) },
              { header: "Installment", cell: (r) => formatRwf(r.installment) },
              { header: "Balance After", cell: (r) => formatRwf(r.balanceAfter) },
            ]}
            rows={calc.schedule}
            rowKey={(r) => String(r.month)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
