import { useState } from "react";
import { Link } from "react-router-dom";
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
  Users,
  Wallet,
  FileText,
  Gavel,
  FileCheck,
  Landmark,
  CircleDollarSign,
  CheckCheck,
  Lock,
  BarChart3,
  Mail,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { AnimatedStatCard } from "@/components/shared/animated-stat-card";
import { Reveal } from "@/components/shared/reveal";
import { BrowserFrame } from "@/components/shared/browser-frame";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { BarComparisonChart } from "@/components/charts/bar-comparison-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { formatRwf } from "@/lib/format";
import { PLATFORM_ORGANIZATIONS, SUBSCRIPTION_PLANS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURED_FEATURE: FeatureItem = {
  icon: HandCoins,
  title: "The full loan lifecycle",
  description:
    "Submitted → Guarantor Approval → Committee Review → Approved → Contract → Disbursed → Repaying → Completed, with a live calculator and auto-generated loan contracts.",
};

const FEATURE_GROUPS: { title: string; items: FeatureItem[] }[] = [
  {
    title: "Money in, money out",
    items: [
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
    ],
  },
  {
    title: "People you can trust",
    items: [
      {
        icon: ShieldCheck,
        title: "Guarantors & risk scoring",
        description:
          "Loans above a member's savings automatically require a guarantor and a 1% insurance fee, with a transparent risk score for the Loan Committee.",
      },
      {
        icon: LayoutDashboard,
        title: "A workspace for every role",
        description:
          "Member, Secretary, Accountant, Loan Committee, HR, and Organization Admin each get a dedicated workspace — and every admin is also a member, switchable from the sidebar.",
      },
      {
        icon: Lock,
        title: "Security & data isolation",
        description:
          "Each organization's members, savings, and loans live in a completely isolated workspace, with role-based access down to individual screens.",
      },
    ],
  },
  {
    title: "Run the organization",
    items: [
      {
        icon: BarChart3,
        title: "Reporting & analytics",
        description:
          "Savings growth, loan portfolio health, and membership trends — built from the same records your officers work in, not a separate export.",
      },
      {
        icon: Building2,
        title: "Multi-tenant organization management",
        description:
          "Every SACCO, cooperative, or employee savings association runs on its own isolated workspace — hosted independently, not tied to any single institution's infrastructure.",
      },
    ],
  },
];

const JOURNEY: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Building2,
    title: "Organization registration",
    description: "A cooperative signs up and gets its own isolated workspace, branding, and admin account.",
  },
  {
    icon: Users,
    title: "Member onboarding",
    description: "Secretaries add members with National ID, employment details, and opening shares.",
  },
  {
    icon: Wallet,
    title: "Savings & payroll deductions",
    description: "Monthly salary deductions and voluntary top-ups build each member's savings balance.",
  },
  {
    icon: FileText,
    title: "Loan application",
    description: "A member applies with amount, purpose, and term — the calculator shows terms instantly.",
  },
  {
    icon: Gavel,
    title: "Guarantor & committee review",
    description: "Loans above savings require guarantor sign-off first, then Loan Committee review.",
  },
  {
    icon: FileCheck,
    title: "Contract generated",
    description: "An approved loan auto-generates a signed contract with the real repayment schedule.",
  },
  {
    icon: Landmark,
    title: "Disbursement",
    description: "The Accountant records disbursement and funds move to the member's account.",
  },
  {
    icon: CircleDollarSign,
    title: "Salary repayment",
    description: "Monthly installments deduct automatically from payroll until the balance clears.",
  },
  {
    icon: CheckCheck,
    title: "Completed",
    description: "The loan closes, freeing the member's borrowing capacity for the next cycle.",
  },
];

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Isolated by organization",
    description:
      "Every cooperative's members, savings, and loans live in their own workspace — never mixed with another organization's data.",
  },
  {
    icon: ShieldCheck,
    title: "Built for reliability",
    description:
      "Balances, contracts, and disbursements are the system of record your officers and auditors can trust.",
  },
  {
    icon: Building2,
    title: "Built for Rwanda",
    description:
      "Currency-native to RWF, aligned to how Rwandan SACCOs and cooperatives actually approve and disburse loans.",
  },
];

const PORTFOLIO_TREND = [
  { month: "Mar", value: 24 },
  { month: "Apr", value: 27 },
  { month: "May", value: 29 },
  { month: "Jun", value: 33 },
  { month: "Jul", value: 36 },
  { month: "Aug", value: 41 },
];

const SAVINGS_VS_LOANS = [
  { month: "Apr", savings: 18, loans: 9 },
  { month: "May", savings: 21, loans: 11 },
  { month: "Jun", savings: 25, loans: 13 },
  { month: "Jul", savings: 29, loans: 15 },
  { month: "Aug", savings: 34, loans: 18 },
];

const LOAN_STATUS_DONUT = [
  { key: "repaying", label: "Repaying", value: 52, color: "var(--chart-1)" },
  { key: "completed", label: "Completed", value: 31, color: "var(--chart-2)" },
  { key: "review", label: "Under review", value: 17, color: "var(--chart-4)" },
];

const PLAN_ICONS: Record<string, LucideIcon> = {
  "plan-starter": Wallet,
  "plan-growth": TrendingUp,
  "plan-enterprise": Building2,
};

const PLAN_SUPPORT: Record<string, string> = {
  "plan-starter": "Email support",
  "plan-growth": "Priority support",
  "plan-enterprise": "Dedicated account manager",
};

const FAQS = [
  {
    question: "Where is our cooperative's data hosted?",
    answer:
      "Each organization runs on its own isolated workspace in the cloud — independent of any single district office or institution's own infrastructure, with your own login, branding, and member list.",
  },
  {
    question: "We currently track everything in Excel. Can we migrate?",
    answer:
      "Yes. The Accountant and HR workspaces include an Excel payroll importer that validates rows against Employee IDs and reports successes, errors, and duplicates before anything is saved.",
  },
  {
    question: "Is pricing per member or per organization?",
    answer:
      "Each plan covers your whole organization up to a member ceiling — see the plans below. There are no per-seat officer accounts; every role (Secretary, Accountant, Loan Committee, HR, Admin) is included.",
  },
  {
    question: "Can members and officers use this from a phone?",
    answer:
      "Yes. Every workspace — member dashboards, loan review queues, disbursement tools — is built to work on a phone browser as well as a desktop, so field officers and members aren't tied to a computer.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow && (
        <Badge variant="outline" className="mb-3">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {description && <p className="mt-2.5 text-sm text-muted-foreground sm:text-base">{description}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

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
            <Button variant="ghost" size="sm" render={<Link to="/login" />}>
              Log in
            </Button>
            <Button size="sm" className="transition-shadow hover:shadow-soft-md" render={<Link to="/register" />}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px]"
            style={{
              background:
                "radial-gradient(60% 100% at 50% 0%, color-mix(in oklch, var(--primary), transparent 94%), transparent)",
            }}
          />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-4">
                Built for SACCOs & cooperatives in Rwanda
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                Run your cooperative's savings and loans like a real financial institution
              </h1>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Savings, shares, guarantors, loan contracts, payroll import, and reporting —
                in one platform every member, officer, and administrator can trust.
                Currency-native to RWF, ready for real SACCOs from day one.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="transition-shadow hover:shadow-soft-md" render={<Link to="/register" />}>
                  Register your organization <ArrowRight className="size-4" />
                </Button>
                <Button size="lg" variant="outline" render={<Link to="/login" />}>
                  Explore the demo
                </Button>
              </div>
            </div>

            <Reveal className="relative mx-auto mt-14 max-w-4xl" delay={100}>
              <BrowserFrame
                url="app.ikiminaconnect.rw/org-admin/dashboard"
                src="/screenshots/org-dashboard.png"
                alt="Organization dashboard showing total members, savings, active loans, shares, and growth charts"
              />
              <Card className="absolute -bottom-6 -left-4 hidden w-56 shadow-soft-md sm:block md:-left-10">
                <CardContent className="p-0">
                  <AnimatedStatCard
                    label="Loan Approval Rate"
                    endValue={91}
                    formatValue={(n) => `${n}%`}
                    icon={TrendingUp}
                    trend={{ value: "+2 pts", direction: "up", label: "this quarter" }}
                    className="border-0 p-4 shadow-none hover:shadow-none"
                  />
                </CardContent>
              </Card>
            </Reveal>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-wide">Trusted by cooperatives across Rwanda</span>
              {PLATFORM_ORGANIZATIONS.map((org) => (
                <span key={org.id} className="font-medium text-foreground/70">
                  {org.shortName}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Platform at a glance */}
        <section className="border-t bg-primary/[0.025] py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Platform at a glance"
              title="Real numbers from a real, working platform"
              description="Not placeholders — this is what runs across the cooperatives already live on IkiminaConnect."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal>
                <AnimatedStatCard
                  label="Total Savings Managed"
                  endValue={48250000}
                  formatValue={formatRwf}
                  icon={PiggyBank}
                  trend={{ value: "+8.4%", direction: "up", label: "vs last month" }}
                  sparkline={[6, 7, 7, 8, 9, 9, 10, 11]}
                />
              </Reveal>
              <Reveal delay={80}>
                <AnimatedStatCard
                  label="Active Loan Portfolio"
                  endValue={21400000}
                  formatValue={formatRwf}
                  icon={HandCoins}
                  trend={{ value: "+3.1%", direction: "up", label: "vs last month" }}
                  sparkline={[4, 4, 5, 5, 6, 6, 6, 7]}
                />
              </Reveal>
              <Reveal delay={160}>
                <AnimatedStatCard
                  label="Loan Approval Rate"
                  endValue={91}
                  formatValue={(n) => `${n}%`}
                  icon={TrendingUp}
                  trend={{ value: "+2 pts", direction: "up", label: "this quarter" }}
                  sparkline={[80, 82, 85, 86, 88, 89, 90, 91]}
                />
              </Reveal>
              <Reveal delay={240}>
                <AnimatedStatCard
                  label="Cooperatives Onboarded"
                  endValue={PLATFORM_ORGANIZATIONS.length}
                  formatValue={(n) => `${n}`}
                  icon={Building2}
                  trend={{ value: "growing", direction: "up", label: "across Rwanda" }}
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Multi-role workspace */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal>
                <Badge variant="outline" className="mb-4">Multi-role by design</Badge>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Built for how your cooperative is actually organized
                </h2>
                <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                  A Secretary is also a saver. An Accountant has shares and a loan of their
                  own. IkiminaConnect treats every officer as a member first — one login,
                  a workspace switcher in the sidebar, and each role&apos;s tools kept
                  completely separate from their personal savings and loans.
                </p>
                <ul className="mt-6 flex flex-col gap-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    Seven dedicated workspaces: Member, Secretary, Accountant, Loan
                    Committee, HR, Organization Admin, and Platform Admin.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    Switch workspaces in one click — no separate logins or accounts.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    Every organization is fully isolated, from its own subdomain to its
                    own member list and branding.
                  </li>
                </ul>
              </Reveal>
              <Reveal delay={120}>
                <BrowserFrame
                  url="app.ikiminaconnect.rw"
                  src="/screenshots/workspace-switcher.png"
                  alt="Workspace switcher dropdown showing Organization Admin and Member workspaces for the same user"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              title="Everything your cooperative needs, nothing it doesn't"
              description="Every workflow is a fully implemented screen — not a mockup."
            />

            <Reveal className="mt-10">
              <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-soft-md">
                <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:p-8">
                  <div>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FEATURED_FEATURE.icon className="size-5" />
                    </div>
                    <h3 className="mt-3 font-medium">{FEATURED_FEATURE.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{FEATURED_FEATURE.description}</p>
                  </div>
                  <BrowserFrame
                    url="app.ikiminaconnect.rw/loan-committee/pending"
                    src="/screenshots/loan-review.png"
                    alt="Loan Committee review screen with progress stepper, risk score, and loan terms"
                  />
                </CardContent>
              </Card>
            </Reveal>

            <div className="mt-10 flex flex-col gap-10">
              {FEATURE_GROUPS.map((group, gi) => (
                <div key={group.title}>
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.title}
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((f, i) => (
                      <Reveal key={f.title} delay={(gi * 3 + i) * 60}>
                        <Card className="h-full transition-shadow duration-200 hover:shadow-soft-md">
                          <CardContent className="flex flex-col gap-3 p-5">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <f.icon className="size-5" />
                            </div>
                            <h4 className="font-medium">{f.title}</h4>
                            <p className="text-sm text-muted-foreground">{f.description}</p>
                          </CardContent>
                        </Card>
                      </Reveal>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real-time insights */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Reporting & analytics"
              title="Real-time insights, not spreadsheets"
              description="The same charts your officers see in their own dashboards, built from live records."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <Reveal className="h-full">
                <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-soft-md">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <h4 className="text-sm font-medium">Loan portfolio growth</h4>
                    <p className="text-xs text-muted-foreground">Last 6 months, RWF millions</p>
                    <div className="mt-3 flex flex-1 items-center">
                      <TrendLineChart
                        data={PORTFOLIO_TREND}
                        xKey="month"
                        series={[{ key: "value", label: "Portfolio", color: "var(--chart-1)" }]}
                        valueFormatter={(v) => `${v}M`}
                        height={160}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
              <Reveal delay={100} className="h-full">
                <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-soft-md">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <h4 className="text-sm font-medium">Savings vs. loans</h4>
                    <p className="text-xs text-muted-foreground">Organization-wide, RWF millions</p>
                    <div className="mt-3 flex flex-1 items-center">
                      <BarComparisonChart
                        data={SAVINGS_VS_LOANS}
                        xKey="month"
                        series={[
                          { key: "savings", label: "Savings", color: "var(--chart-1)" },
                          { key: "loans", label: "Loans", color: "var(--chart-3)" },
                        ]}
                        valueFormatter={(v) => `${v}M`}
                        height={160}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
              <Reveal delay={200} className="h-full">
                <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-soft-md">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <h4 className="text-sm font-medium">Loan portfolio by status</h4>
                    <p className="text-xs text-muted-foreground">Share of active + closed loans</p>
                    <div className="mt-3 flex flex-1 flex-col justify-center">
                      <DonutChart data={LOAN_STATUS_DONUT} height={150} showLegend />
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="workflow" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              title="The complete journey, from sign-up to loan payoff"
              description="Interest and insurance fees follow your organization's own loan policy. A guarantor is only required when the requested amount exceeds the member's savings."
            />
            <div className="relative mx-auto mt-12 max-w-3xl">
              <div className="absolute top-0 bottom-0 left-[19px] w-px bg-border sm:left-[23px]" />
              <ol className="flex flex-col gap-8">
                {JOURNEY.map((step, i) => (
                  <Reveal key={step.title} delay={i * 60}>
                    <li className="relative flex gap-4 pl-0">
                      <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-card shadow-soft sm:size-12">
                        <step.icon className="size-4 text-primary sm:size-5" />
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {i + 1}
                          </span>
                          <h4 className="text-sm font-medium sm:text-base">{step.title}</h4>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="Why cooperatives trust us" title="Serious infrastructure for serious money" />
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {TRUST_PILLARS.map((pillar, i) => (
                <Reveal key={pillar.title} delay={i * 80}>
                  <Card className="h-full transition-shadow duration-200 hover:shadow-soft-md">
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <pillar.icon className="size-5" />
                      </div>
                      <h4 className="font-medium">{pillar.title}</h4>
                      <p className="text-sm text-muted-foreground">{pillar.description}</p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200} className="mx-auto mt-8 max-w-3xl">
              <Card className="transition-shadow duration-200 hover:shadow-soft-md">
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <Quote className="size-6 text-primary/40" />
                  <p className="text-lg font-medium text-balance">
                    &ldquo;We used to reconcile payroll deductions against a paper
                    ledger every month. Now the whole loan process — application,
                    guarantor approval, committee review, contract — happens on one
                    screen, and members can see it too.&rdquo;
                  </p>
                  <div>
                    <p className="text-sm font-medium">APUPEKA Digital Savings and Loan Cooperative</p>
                    <p className="text-xs text-muted-foreground">First cooperative running on IkiminaConnect</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              title="Simple, transparent pricing"
              description="Pick the plan that fits your membership size. Upgrade anytime."
            />

            <div className="mt-6 flex items-center justify-center gap-1 rounded-full border bg-card p-1 shadow-soft mx-auto w-fit">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    billing === "yearly" ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                  )}
                >
                  2 months free
                </span>
              </button>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan, i) => {
                const Icon = PLAN_ICONS[plan.id] ?? Wallet;
                const monthlyEquivalent =
                  billing === "yearly" ? Math.round((plan.priceMonthlyRwf * 10) / 12) : plan.priceMonthlyRwf;
                return (
                  <Reveal key={plan.id} delay={i * 80}>
                    <Card
                      className={cn(
                        "h-full transition-shadow duration-200 hover:shadow-soft-md",
                        i === 1 && "border-primary shadow-soft-md"
                      )}
                    >
                      <CardContent className="flex h-full flex-col gap-4 p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-4" />
                          </div>
                          {i === 1 && <Badge>Most popular</Badge>}
                        </div>
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatRwf(monthlyEquivalent)}
                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {billing === "yearly" ? "billed yearly" : "billed monthly"} · up to{" "}
                            {plan.maxMembers.toLocaleString()} members
                          </p>
                        </div>
                        <ul className="flex flex-1 flex-col gap-2 text-sm">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs font-medium text-muted-foreground">
                          Support: {PLAN_SUPPORT[plan.id]}
                        </p>
                        <Button variant={i === 1 ? "default" : "outline"} render={<Link to="/register" />} className="mt-1">
                          Get started
                        </Button>
                      </CardContent>
                    </Card>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4">
            <SectionHeading title="Questions cooperative leaders ask us" />
            <div className="mt-8 flex flex-col gap-3">
              {FAQS.map((faq, i) => (
                <Reveal key={faq.question} delay={i * 50}>
                  <details className="group rounded-lg border bg-card px-5 py-4 open:shadow-soft">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none">
                      {faq.question}
                      <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ready to modernize your cooperative?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Register your organization or explore the live demo with real workflows,
              realistic data, and every role represented.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="transition-shadow hover:shadow-soft-md" render={<Link to="/register" />}>
                Register your organization <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link to="/login" />}>
                Explore the demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  IK
                </div>
                <span className="font-semibold">IkiminaConnect</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Cloud savings & loan platform for SACCOs and cooperatives — savings,
                shares, guarantors, loan contracts, payroll import, and reporting in
                one place, currency-native to RWF.
              </p>
              <a
                href="mailto:hello@ikiminaconnect.rw"
                className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-4" />
                hello@ikiminaconnect.rw
              </a>
            </div>

            <div>
              <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Product</h5>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#workflow" className="text-muted-foreground hover:text-foreground">How it works</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Solutions</h5>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>SACCOs</li>
                <li>Employee savings associations</li>
                <li>Multi-branch cooperatives</li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Get started</h5>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <li><Link to="/register" className="text-muted-foreground hover:text-foreground">Register your organization</Link></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-foreground">Log in</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>© 2026 IkiminaConnect. All rights reserved.</span>
            <span>Privacy Policy · Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
