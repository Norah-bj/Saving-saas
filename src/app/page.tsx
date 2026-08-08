import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  HandCoins,
  PiggyBank,
  Upload,
  ShieldCheck,
  Building2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { formatRwf } from "@/lib/format";
import { PLATFORM_ORGANIZATIONS, SUBSCRIPTION_PLANS } from "@/lib/mock-data";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "A workspace for every role",
    description:
      "Member, Secretary, Accountant, Loan Committee, HR, and Organization Admin each get a dedicated workspace — and every admin is also a member, switchable from the sidebar.",
  },
  {
    icon: HandCoins,
    title: "The full loan lifecycle",
    description:
      "Submitted → Review → Guarantor Approval → Committee Review → Approved → Contract → Disbursed → Repaying → Completed, with a live calculator and auto-generated loan contracts.",
  },
  {
    icon: PiggyBank,
    title: "Savings, shares & statements",
    description:
      "Salary deductions, voluntary savings, and share purchases all flow into a bank-style statement with running balances your members can trust.",
  },
  {
    icon: Upload,
    title: "Excel payroll import",
    description:
      "Accountants and HR officers upload the monthly payroll file directly — rows are validated against Employee IDs with a clear success/error/duplicate summary.",
  },
  {
    icon: ShieldCheck,
    title: "Guarantors & risk scoring",
    description:
      "Loans above a member's savings automatically require a guarantor and a 1% insurance fee, with a transparent risk score for the Loan Committee.",
  },
  {
    icon: Building2,
    title: "Built for multi-tenant SaaS",
    description:
      "Every SACCO, cooperative, or employee savings association runs on its own isolated workspace — hosted independently, not tied to any single institution's infrastructure.",
  },
];

const PIPELINE = [
  "Submitted",
  "Committee Review",
  "Approved",
  "Contract Generated",
  "Disbursed",
  "Repaying",
  "Completed",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              IK
            </div>
            <span className="font-semibold">IkiminaConnect</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#workflow" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
              Log in
            </Button>
            <Button size="sm" render={<Link href="/register" />}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">
              Built for SACCOs & cooperatives in Rwanda
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              The complete savings & loan platform for your cooperative
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Savings, shares, guarantors, loan contracts, payroll import, and reporting —
              in one enterprise-grade platform every member, officer, and administrator
              can trust. Currency-native to RWF, ready for real SACCOs from day one.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" render={<Link href="/register" />}>
                Register your organization <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />}>
                Explore the demo
              </Button>
            </div>
          </div>

          <Card className="mx-auto mt-14 max-w-4xl overflow-hidden py-0">
            <CardContent className="grid gap-0 p-0 sm:grid-cols-3">
              <div className="grid gap-3 border-b p-5 sm:border-b-0 sm:border-r">
                <StatCard label="Total Savings" value={formatRwf(48250000)} icon={PiggyBank} trend={{ value: "+8.4%", direction: "up", label: "vs last month" }} className="border-0 p-0 shadow-none" />
              </div>
              <div className="grid gap-3 border-b p-5 sm:border-b-0 sm:border-r">
                <StatCard label="Active Loan Portfolio" value={formatRwf(21400000)} icon={HandCoins} trend={{ value: "+3.1%", direction: "up", label: "vs last month" }} className="border-0 p-0 shadow-none" />
              </div>
              <div className="grid gap-3 p-5">
                <StatCard label="Loan Approval Rate" value="91%" icon={TrendingUp} trend={{ value: "+2 pts", direction: "up", label: "this quarter" }} className="border-0 p-0 shadow-none" />
              </div>
            </CardContent>
          </Card>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-wide">Trusted by cooperatives across Rwanda</span>
            {PLATFORM_ORGANIZATIONS.map((org) => (
              <span key={org.id} className="font-medium text-foreground/70">
                {org.shortName}
              </span>
            ))}
          </div>
        </section>

        <section id="features" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything your cooperative needs, nothing it doesn&apos;t
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every workflow is a fully implemented screen — not a mockup.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.title}>
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                A loan lifecycle members can follow, step by step
              </h2>
              <p className="mt-3 text-muted-foreground">
                Interest is a flat 5%. A 1% insurance fee and a guarantor are only
                required when the requested amount exceeds the member&apos;s savings.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {PIPELINE.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                      {i + 1}
                    </span>
                    {stage}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="size-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-3 text-muted-foreground">
                Pick the plan that fits your membership size. Upgrade anytime.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan, i) => (
                <Card key={plan.id} className={i === 1 ? "border-primary shadow-md" : undefined}>
                  <CardContent className="flex flex-col gap-4 p-5">
                    {i === 1 && <Badge className="w-fit">Most popular</Badge>}
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="mt-1 text-2xl font-semibold">
                        {formatRwf(plan.priceMonthlyRwf)}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Up to {plan.maxMembers.toLocaleString()} members
                      </p>
                    </div>
                    <ul className="flex flex-col gap-2 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button variant={i === 1 ? "default" : "outline"} render={<Link href="/register" />} className="mt-2">
                      Get started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to modernize your cooperative?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Register your organization or explore the live demo with real workflows,
              realistic data, and every role represented.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" render={<Link href="/register" />}>
                Register your organization <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />}>
                Explore the demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
              IK
            </div>
            <span>IkiminaConnect — Cloud savings & loan platform for cooperatives</span>
          </div>
          <span>© 2026 IkiminaConnect. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
