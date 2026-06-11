export type MpEntitlementInput = {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
};

export function hasMpEntitlement(user: MpEntitlementInput, now = Date.now()): boolean {
  // MP access is free during early access. Billing fields remain for future paid
  // office features, but they should not block the core dashboard.
  void user;
  void now;
  return true;
}
