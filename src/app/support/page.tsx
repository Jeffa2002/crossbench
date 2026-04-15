import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SupportClient from './SupportClient';

export default function SupportPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <SupportClient />
      <Footer />
    </main>
  );
}
