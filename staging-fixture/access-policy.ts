import type { App } from "../src/types/app.ts";
import type { Pass } from "../src/types/pass.ts";
import type { AccessSource, Subscription } from "../src/types/subscription.ts";

/** Central policy used by access-server. Inputs come from the verified server repository.
 * Only active Stripe subscriptions authorize V1; no implicit grace or trials.
 * Pending invoice processing does not revoke an otherwise active, unexpired period.
 */
export function getAppAccess({ userId, app, subscriptions, passes, now = new Date(), allowTrials = false }: {
  userId: string | null;
  app: Pick<App, "id" | "accessModel">;
  subscriptions: Subscription[];
  passes: Pick<Pass, "id" | "appIds">[];
  now?: Date;
  allowTrials?: boolean;
}): { allowed: boolean; sources: AccessSource[] } {
  if (app.accessModel === "free") return { allowed: true, sources: [{ kind: "free" }] };
  const sources: AccessSource[] = [];
  if (!userId || !Number.isFinite(now.getTime())) return { allowed: false, sources };
  for (const subscription of subscriptions) {
    if (subscription.userId !== userId) continue;
    if (subscription.status !== "active" && !(allowTrials && subscription.status === "trialing")) continue;
    const start = Date.parse(subscription.accessStartsAt);
    const end = Date.parse(subscription.accessEndsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > now.getTime() || end <= now.getTime()) continue;
    const seen = new Set<string>();
    for (const item of subscription.items) {
      // Fail closed for malformed records even if received from untyped storage.
      if (Boolean(item.appId) === Boolean(item.passId)) continue;
      const pass = item.passId ? passes.find((p) => p.id === item.passId && p.appIds.includes(app.id)) : undefined;
      const key = pass ? `pass:${pass.id}` : `app:${item.appId}`;
      if (seen.has(key) || (!pass && item.appId !== app.id)) continue;
      seen.add(key);
      sources.push({ kind: pass ? "pass" : "individual", subscriptionId: subscription.id, ...(pass ? { passId: pass.id } : {}), expiresAt: subscription.accessEndsAt });
    }
  }
  return { allowed: sources.length > 0, sources };
}
