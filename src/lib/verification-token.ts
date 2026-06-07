import { createHmac, timingSafeEqual } from 'crypto';

export type VerificationPayload = {
  electorateId: string;
  addressHash: string;
  userId: string;
  exp: number;
};

const TOKEN_TTL_MS = 30 * 60 * 1000;

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error('NEXTAUTH_SECRET is not configured');
  return value;
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', secret()).update(encodedPayload).digest('hex');
}

function addressHash(normalizedAddress: string): string {
  return createHmac('sha256', secret()).update(normalizedAddress.trim().toLowerCase()).digest('hex');
}

export function createVerificationToken(electorateId: string, normalizedAddress: string, userId: string): string {
  const payload: VerificationPayload = {
    electorateId,
    addressHash: addressHash(normalizedAddress),
    userId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readVerificationToken(token: unknown, userId: string): VerificationPayload | null {
  if (typeof token !== 'string') return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as VerificationPayload;
    if (!payload.electorateId || !payload.addressHash || !payload.userId || !payload.exp) return null;
    if (payload.userId !== userId) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
