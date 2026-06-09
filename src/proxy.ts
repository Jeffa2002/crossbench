import { NextRequest, NextResponse } from 'next/server'

// ─── CSP nonce proxy ──────────────────────────────────────────────────────────
// Generates a fresh cryptographic nonce per request.
// The nonce is injected into the CSP header and passed to the root layout
// via a response header (x-nonce) so Next.js can apply it to inline scripts.

function generateNonce(): string {
  // Use crypto.getRandomValues for a 128-bit random nonce
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return atob(padded)
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
}

async function hasAdminSession(request: NextRequest): Promise<boolean> {
  const cookieSecret = process.env.MISSION_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  const token = request.cookies.get('admin_session')?.value

  if (!cookieSecret || !token) return false

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expected = await hmacHex(payload, cookieSecret)
  if (signature !== expected) return false

  try {
    const decoded = JSON.parse(decodeBase64Url(payload))
    return decoded.purpose === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce()

  const cspHeader = [
    // Only load resources from same origin by default
    `default-src 'self'`,
    // Scripts: same origin + nonce for Next.js inline chunks + reCAPTCHA v3
    `script-src 'self' 'nonce-${nonce}' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
    // Styles: same origin + unsafe-inline (Tailwind v4 CSS-in-JS injects styles)
    `style-src 'self' 'unsafe-inline'`,
    // Images: same origin + data URIs (avatars) + APH/Wikipedia photos
    `img-src 'self' data: https://www.aph.gov.au https://*.aph.gov.au https://upload.wikimedia.org https://*.wikimedia.org https://en.wikipedia.org https://*.wikipedia.org`,
    // Fonts: Google Fonts (used in root layout via next/font/google)
    `font-src 'self' https://fonts.gstatic.com`,
    // Connect: same origin API calls + Plausible + reCAPTCHA
    `connect-src 'self' https://plausible.io https://www.google.com/recaptcha/`,
    // reCAPTCHA uses an iframe
    `frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/`,
    // Prevent this app from being embedded in iframes (clickjacking)
    `frame-ancestors 'none'`,
    // Forms: same origin only
    `form-action 'self'`,
    // No plugins
    `object-src 'none'`,
    // Force HTTPS for all mixed content
    `upgrade-insecure-requests`,
  ].join('; ')

  if (request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')) {
    if (!await hasAdminSession(request)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin-login'
      url.search = ''
      const response = NextResponse.redirect(url)
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }
  }

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

export default proxy

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
