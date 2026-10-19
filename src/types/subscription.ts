export type SubscriptionStatus = "active" | "trialing" | "past_due" | "incomplete" | "incomplete_expired" | "unpaid" | "canceled" | "paused";
export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  accessStartsAt: string;
  accessEndsAt: string;
  cancelAtPeriodEnd: boolean;
  items: ({ appId: string; passId?: never } | { passId: string; appId?: never })[];
}
export interface AccessSource {
  kind: "free" | "individual" | "pass";
  subscriptionId?: string;
  passId?: string;
  expiresAt?: string;
}
