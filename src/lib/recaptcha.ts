/**
 * Verify a reCAPTCHA v3 token server-side.
 * Returns true if the score is above the threshold (0.5 by default).
 */
export async function verifyRecaptcha(token: string, minScore = 0.5): Promise<{ ok: boolean; score?: number; error?: string }> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, error: 'reCAPTCHA not configured' };

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();

    if (!data.success) return { ok: false, score: data.score, error: 'reCAPTCHA verification failed' };
    if (data.score < minScore) return { ok: false, score: data.score, error: `Score too low: ${data.score}` };

    return { ok: true, score: data.score };
  } catch (e) {
    return { ok: false, error: 'reCAPTCHA request failed' };
  }
}
