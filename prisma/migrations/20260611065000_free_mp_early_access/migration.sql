UPDATE "User"
SET
  "subscriptionStatus" = 'ACTIVE',
  "subscriptionTier" = 'PRO',
  "trialEndsAt" = NULL
WHERE "role" = 'MP';
