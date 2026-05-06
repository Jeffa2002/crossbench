import type { Metadata } from 'next';
import Nav from '@/components/Nav';

export const metadata: Metadata = { title: 'Stats — Crossbench' };

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      {children}
    </div>
  );
}
