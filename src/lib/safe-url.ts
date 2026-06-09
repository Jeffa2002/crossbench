function hostMatches(hostname: string, allowedHost: string) {
  const host = hostname.toLowerCase();
  const allowed = allowedHost.toLowerCase();
  if (allowed.startsWith('.')) return host.endsWith(allowed) || host === allowed.slice(1);
  return host === allowed;
}

export function safeHttpsUrl(value: string | null | undefined, allowedHosts: readonly string[]) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!allowedHosts.some(host => hostMatches(url.hostname, host))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const APH_URL_HOSTS = ['aph.gov.au', '.aph.gov.au'] as const;

export const MP_PHOTO_URL_HOSTS = [
  'aph.gov.au',
  '.aph.gov.au',
  'wikipedia.org',
  '.wikipedia.org',
  'wikimedia.org',
  '.wikimedia.org',
] as const;
