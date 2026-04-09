import Nav from '@/components/Nav';
import BillingClient from './BillingClient';

export default function BillingPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <BillingClient />
    </main>
  );
}
