import { NextRequest, NextResponse } from 'next/server'

// ─── CSP nonce middleware ─────────────────────────────────────────────────────
// Generates a fresh cryptographic nonce per request.
// The nonce is injected into the CSP header and passed to the root layout
// via a response header (x-nonce) so Next.js can apply it to inline scripts.

function generateNonce(): string {
  // Use crypto.getRandomValues for a 128-bit random nonce
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce()

  const cspHeader = [
    // Only load resources from same origin by default
    `default-src 'self'`,
    // Scripts: same origin + nonce for Next.js inline chunks
    // Plausible tracker is bundled locally — no external script domain needed
    `script-src 'self' 'nonce-${nonce}'`,
    // Styles: same origin + unsafe-inline (Tailwind v4 CSS-in-JS injects styles)
    `style-src 'self' 'unsafe-inline'`,
    // Images: same origin + data URIs (avatars) + APH/Wikipedia photos
    `img-src 'self' data: https://www.aph.gov.au https://upload.wikimedia.org https://en.wikipedia.org`,
    // Fonts: Google Fonts (used in root layout via next/font/google)
    `font-src 'self' https://fonts.gstatic.com`,
    // Connect: same origin API calls + Plausible event tracking
    `connect-src 'self' https://plausible.io`,
    // Stripe checkout is server-side redirect — no frame embedding of Stripe needed
    `frame-src 'none'`,
    // Prevent this app from being embedded in iframes (clickjacking)
    `frame-ancestors 'none'`,
    // Forms: same origin only
    `form-action 'self'`,
    // No plugins
    `object-src 'none'`,
    // Force HTTPS for all mixed content
    `upgrade-insecure-requests`,
    // Report violations to console (swap for report-uri endpoint later)
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  // Pass nonce to layout via header so server components can read it
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set CSP header on response
  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public assets
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
