'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SESSION_KEY = 'crossbench_analytics_session';
const SENSITIVE_QUERY_KEYS = /token|secret|code|email|password|callback|redirect|session|state/i;

function sessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function postJson(url: string, body: unknown, beacon = false) {
  const payload = JSON.stringify(body);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    return;
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: beacon,
  }).catch(() => {});
}

function safePath(pathname: string, searchParams: URLSearchParams | null) {
  if (!searchParams?.toString()) return pathname;
  const clean = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (!SENSITIVE_QUERY_KEYS.test(key)) clean.set(key, value);
  });
  const query = clean.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function safeReferrer(referrer: string) {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    const clean = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (!SENSITIVE_QUERY_KEYS.test(key)) clean.set(key, value);
    });
    url.search = clean.toString();
    url.hash = '';
    return url.toString();
  } catch {
    return referrer.split('?')[0].slice(0, 500);
  }
}

export default function FirstPartyAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = useRef<{ id: string; startedAt: number } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;

    const previous = currentView.current;
    if (previous) {
      postJson('/api/analytics/pageview/end', {
        pageViewId: previous.id,
        durationSeconds: Math.round((Date.now() - previous.startedAt) / 1000),
      }, true);
      currentView.current = null;
    }

    const url = safePath(pathname, searchParams);
    let active = true;
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId(),
        path: url,
        title: document.title,
        referrer: safeReferrer(document.referrer),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (active && data?.pageViewId) currentView.current = { id: data.pageViewId, startedAt: Date.now() };
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    function flush() {
      const view = currentView.current;
      if (!view) return;
      postJson('/api/analytics/pageview/end', {
        pageViewId: view.id,
        durationSeconds: Math.round((Date.now() - view.startedAt) / 1000),
      }, true);
    }

    function flushWhenHidden() {
      if (document.visibilityState === 'hidden') flush();
    }

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, []);

  return null;
}
