import type { VerificationStatus } from '@prisma/client';

type VerificationInput = {
  verifiedAt?: Date | string | null;
  electorateId?: string | null;
  electorateVerified?: boolean | null;
  verificationStatus?: VerificationStatus | string | null;
};

export const ADDRESS_VERIFICATION_STATUSES: VerificationStatus[] = ['ADDRESS', 'IDENTITY'];

export function isAddressVerified(user: VerificationInput | null | undefined) {
  return !!(
    user?.verifiedAt &&
    user.electorateId &&
    user.electorateVerified &&
    user.verificationStatus &&
    ADDRESS_VERIFICATION_STATUSES.includes(user.verificationStatus as VerificationStatus)
  );
}

export const addressVerifiedUserWhere = {
  verifiedAt: { not: null },
  electorateId: { not: null },
  electorateVerified: true,
  verificationStatus: { in: ADDRESS_VERIFICATION_STATUSES },
};
