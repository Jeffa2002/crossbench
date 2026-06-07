const DEFAULT_APP_URL = 'https://crossbench.io';

export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || DEFAULT_APP_URL;

  try {
    const url = new URL(configured);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_APP_URL;
  }
}

export function appUrl(path = '/'): string {
  return new URL(path, `${getAppBaseUrl()}/`).toString();
}

export function safeRelativeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;

  try {
    const url = new URL(value, 'https://crossbench.local');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
