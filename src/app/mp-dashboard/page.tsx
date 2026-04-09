import Nav from '@/components/Nav';
import MpDashboardClient from './MpDashboardClient';

export default function MpDashboardPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <MpDashboardClient />
    </main>
  );
}
