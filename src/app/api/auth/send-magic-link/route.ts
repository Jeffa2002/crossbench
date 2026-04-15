import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { verifyRecaptcha } from '@/lib/recaptcha';

export async function POST(req: NextRequest) {
  const { email, recaptchaToken, redirectTo } = await req.json();

  if (!email || !recaptchaToken) {
    return NextResponse.json({ error: 'Missing email or reCAPTCHA token' }, { status: 400 });
  }

  // Verify reCAPTCHA score server-side
  const captcha = await verifyRecaptcha(recaptchaToken, 0.5);
  if (!captcha.ok) {
    console.warn(`[reCAPTCHA] Blocked login attempt for ${email}: score=${captcha.score}, error=${captcha.error}`);
    return NextResponse.json(
      { error: 'Automated activity detected. Please try again.' },
      { status: 429 }
    );
  }

  try {
    await signIn('resend', {
      email,
      redirect: false,
      redirectTo: redirectTo || '/',
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // next-auth throws on redirect — catch and return ok
    if (e?.message === 'NEXT_REDIRECT') return NextResponse.json({ ok: true });
    console.error('[send-magic-link]', e);
    return NextResponse.json({ error: 'Failed to send link. Try again.' }, { status: 500 });
  }
}
