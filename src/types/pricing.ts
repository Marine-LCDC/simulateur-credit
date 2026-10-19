export type BillingInterval = "month" | "year";
export type PricingType = "free" | "subscription" | "quote";
// QUOTE applications and custom requests have no subscription pricing plan.
export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  pricingType: "subscription";
  amountCents?: number;
  currency: "EUR";
  billingInterval: BillingInterval;
  features?: string[];
  recommended?: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
  displayOrder: number;
}
