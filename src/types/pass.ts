import type { PricingPlan } from "./pricing";
export interface Pass {
  id: string;
  slug: string;
  name: string;
  description: string;
  // Presentation only. Never use this field to grant access.
  primaryUniverseId: string | null;
  appIds: string[];
  published: boolean;
  salesStatus: "planned" | "available" | "closed";
  pricingPlans: PricingPlan[];
  displayOrder: number;
}
