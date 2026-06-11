import { Suspense } from 'react';
import Nav from '@/components/Nav';
import AcceptInviteClient from './AcceptInviteClient';

export default function AcceptStaffInvitePage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <Suspense fallback={<div className="page-container" style={{ color: '#7E8AA3' }}>Loading invite...</div>}>
        <AcceptInviteClient />
      </Suspense>
    </main>
  );
}
