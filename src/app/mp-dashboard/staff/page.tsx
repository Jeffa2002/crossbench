import Nav from '@/components/Nav';
import StaffClient from './StaffClient';

export default function MpStaffPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <StaffClient />
    </main>
  );
}
