import { createHmac, timingSafeEqual } from 'crypto';

// C-01: Server-signed analytics identifiers.
// The pageview POST returns a signed pageViewId so that the /end endpoint
// can verify the client is reporting against a pageView the server actually
// issued (and for that session), preventing forged/guessed-ID poisoning.

const SECRET =
  process.env.ANALYTICS_TOKEN_SECRET ||
  process.env.ANALYTICS_HASH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.MISSION_COOKIE_SECRET ||
  'crossbench-analytics-token';

function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/**
 * Produce an opaque token binding a pageView id to its session id.
 * Returned to the client from the pageview POST and required by /end.
 */
export function signPageView(pageViewId: string, sessionId: string): string {
  const payload = Buffer.from(`${pageViewId}:${sessionId}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a token and return the bound pageViewId + sessionId, or null.
 */
export function verifyPageViewToken(
  token: unknown
): { pageViewId: string; sessionId: string } | null {
  if (typeof token !== 'string' || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep <= 0) return null;
    const pageViewId = decoded.slice(0, sep);
    const sessionId = decoded.slice(sep + 1);
    if (!pageViewId || !sessionId) return null;
    return { pageViewId, sessionId };
  } catch {
    return null;
  }
}
