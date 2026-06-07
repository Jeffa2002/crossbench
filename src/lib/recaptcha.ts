/**
 * Verify a reCAPTCHA v3 token server-side.
 * Returns true if the score is above the threshold (0.5 by default).
 */
export async function verifyRecaptcha(
  token: string,
  minScore = 0.5,
  opts: { expectedAction?: string; expectedHostname?: string } = {}
): Promise<{ ok: boolean; score?: number; error?: string }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, error: 'reCAPTCHA not configured' };

  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();

    if (!data.success) return { ok: false, score: data.score, error: 'reCAPTCHA verification failed' };
    if (opts.expectedAction && data.action !== opts.expectedAction) {
      return { ok: false, score: data.score, error: 'reCAPTCHA action mismatch' };
    }
    const expectedHostname = opts.expectedHostname || process.env.RECAPTCHA_EXPECTED_HOSTNAME;
    if (expectedHostname && data.hostname !== expectedHostname) {
      return { ok: false, score: data.score, error: 'reCAPTCHA hostname mismatch' };
    }
    if (data.score < minScore) return { ok: false, score: data.score, error: `Score too low: ${data.score}` };

    return { ok: true, score: data.score };
  } catch {
    return { ok: false, error: 'reCAPTCHA request failed' };
  }
}
