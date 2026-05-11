// /src/app/(main)/alerts/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import AlertsClient from './AlertsClient';

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/alerts');
  
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) redirect('/login');

  const alerts = await prisma.billAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { notifications: true }
      }
    }
  });

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>Bill Alerts</h1>
          <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
            Get notified when new bills match your keywords.
          </p>
        </div>

        <AlertsClient initialAlerts={alerts} />

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #25324D' }}>
          <Link href="/bills" style={{ color: '#60A5FA', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Bills
          </Link>
        </div>
      </div>
    </main>
  );
}
