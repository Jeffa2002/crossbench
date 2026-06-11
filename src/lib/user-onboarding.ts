import { isAddressVerified } from '@/lib/verification';

type UserForOnboarding = {
  role?: string | null;
  verifiedAt?: Date | string | null;
  electorateId?: string | null;
  electorateVerified?: boolean | null;
  verificationStatus?: string | null;
};

export function needsCitizenAddressOnboarding(user: UserForOnboarding | null | undefined) {
  return user?.role === 'CITIZEN' && !isAddressVerified(user);
}
