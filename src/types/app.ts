export type AppStatus =
  "draft" | "coming_soon" | "beta" | "published" | "archived";
import type { PricingPlan } from "./pricing";
export type { PricingPlan, PricingType, BillingInterval } from "./pricing";
export interface Feature {
  title: string;
  description: string;
}
export interface FAQItem {
  question: string;
  answer: string;
}
export interface Screenshot {
  src: string;
  alt: string;
  caption?: string;
}
/** Optional card artwork. Layouts describe visual patterns, not app identities. */
export type CardVisual =
  | { type: "metrics"; headline: string; label: string; title: string; items: string[]; footer: string }
  | { type: "script"; headline: string; label: string; lines: string[]; footer: string }
  | { type: "calculator"; headline: string; label: string; fields: { label: string; value: string }[]; resultLabel: string; result: string }
  | { type: "image"; headline?: string; src: string; alt: string };
export interface App {
  id: string;
  slug: string;
  name: string;
  baseline: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  universeIds: string[];
  accessModel: "free" | "subscription" | "quote";
  salesStatus?: "planned" | "available" | "closed";
  isNew?: boolean;
  cardVisual?: CardVisual;
  targetAudience: string;
  problem: string;
  solution: string;
  features: Feature[];
  benefits: string[];
  steps: Feature[];
  logo: string | null;
  coverImage: string | null;
  screenshots: Screenshot[];
  pricingPlans: PricingPlan[];
  appUrl: string;
  signupUrl: string | null;
  status: AppStatus;
  featured: boolean;
  displayOrder: number;
  seoTitle: string;
  seoDescription: string;
  faq: FAQItem[];
  accentColor: string;
  monogram: string;
  contentNotice?: string;
  createdAt: string;
  updatedAt: string;
}
