'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

type TrackedLinkProps = {
  href: string;
  event: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function TrackedLink({ href, event, children, className, style }: TrackedLinkProps) {
  async function trackClick() {
    try {
      const { track } = await import('@plausible-analytics/tracker');
      track(event, { props: { href } });
    } catch {
      // Analytics should never block navigation.
    }
  }

  return (
    <Link href={href} onClick={trackClick} className={className} style={style}>
      {children}
    </Link>
  );
}
