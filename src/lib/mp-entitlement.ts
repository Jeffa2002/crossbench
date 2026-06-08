export type MpEntitlementInput = {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
};

export function hasMpEntitlement(user: MpEntitlementInput, now = Date.now()): boolean {
  if (user.subscriptionStatus === 'ACTIVE') return true;
  if (user.subscriptionStatus === 'TRIAL' && user.trialEndsAt && user.trialEndsAt.getTime() >= now) return true;
  return false;
}
