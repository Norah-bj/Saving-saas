import type { SubscriptionPlan } from "@/lib/types";

/**
 * The platform's subscription plans — static reference data (prices and the
 * marketing feature list), shown on the landing page's pricing section and
 * used by the super-admin Billing/Dashboard pages to value each
 * organization's plan. Organizations store only the plan id
 * (`starter`/`growth`/`enterprise`); there is no billing backend, so prices
 * live here rather than in the API.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-starter",
    name: "Starter",
    priceMonthlyRwf: 49000,
    maxMembers: 50,
    features: [
      "Up to 50 members",
      "Savings & shares management",
      "Loan workflow & contracts",
      "Email support",
    ],
  },
  {
    id: "plan-growth",
    name: "Growth",
    priceMonthlyRwf: 129000,
    maxMembers: 200,
    features: [
      "Up to 200 members",
      "Everything in Starter",
      "Excel payroll import",
      "Advanced reports & analytics",
      "Priority support",
    ],
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    priceMonthlyRwf: 349000,
    maxMembers: 2000,
    features: [
      "Unlimited members",
      "Everything in Growth",
      "Multi-branch support",
      "Custom branding",
      "Dedicated account manager",
      "SLA-backed uptime",
    ],
  },
];

/** Monthly price of an organization's plan id (`starter`/`growth`/`enterprise`), 0 if unknown. */
export function planPriceRwf(plan: string): number {
  return SUBSCRIPTION_PLANS.find((p) => p.id === `plan-${plan}`)?.priceMonthlyRwf ?? 0;
}
