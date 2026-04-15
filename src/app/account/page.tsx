import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import ChangeAddressButton from './ChangeAddressButton';

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/account');
  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      electorate: true,
      votes: { orderBy: { createdAt: 'desc' }, take: 10, include: { bill: { select: { id: true, title: true } } } },
    },
  });
  if (!user) redirect('/login');

  // Check address change eligibility
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const addressChangesThisYear = user.verifiedAt
    ? await prisma.addressChangeLog.count({ where: { userId, createdAt: { gte: oneYearAgo } } })
    : 0;
  const canChangeAddress = addressChangesThisYear < 1;
  const needsTicket = addressChangesThisYear >= 1;

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>My account</h1>
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>{user.email}</p>
          </div>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
            <button type="submit" style={{ backgroundColor: 'transparent', color: '#7E8AA3', border: '1px solid #25324D', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              Sign out
            </button>
          </form>
        </div>

        {/* Verification */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#F5F7FB' }}>Electorate verification</h2>
          {user.verifiedAt && user.electorate ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <div>
                  <p style={{ fontWeight: 600, color: '#F5F7FB', margin: 0 }}>Verified — {user.electorate.name}</p>
                  <p style={{ fontSize: '13px', color: '#7E8AA3', margin: '4px 0 0' }}>{user.electorate.state}{user.electorate.mpName ? ` · ${user.electorate.mpName}` : ''}</p>
                </div>
              </div>
              <ChangeAddressButton canChange={canChangeAddress} needsTicket={needsTicket} changesThisYear={addressChangesThisYear} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: 600, color: '#F5F7FB', margin: 0 }}>Not verified</p>
                  <p style={{ fontSize: '13px', color: '#7E8AA3', margin: '4px 0 0' }}>Verify your address to vote on bills</p>
                </div>
              </div>
              <Link href="/account/verify" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                Verify now →
              </Link>
            </div>
          )}
        </div>

        {/* Votes */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#F5F7FB' }}>Your votes</h2>
          {user.votes.length === 0 ? (
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
              No votes yet. <Link href="/bills" style={{ color: '#2E8B57', textDecoration: 'none' }}>Browse bills →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {user.votes.map(vote => (
                <Link key={vote.id} href={`/bills/${vote.bill.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '8px', border: '1px solid #25324D',
                  textDecoration: 'none', gap: '12px'
                }}>
                  <span style={{ fontSize: '14px', color: '#B6C0D1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vote.bill.title}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '4px', flexShrink: 0,
                    backgroundColor: vote.position === 'SUPPORT' ? 'rgba(46,139,87,0.2)' : vote.position === 'OPPOSE' ? 'rgba(217,92,75,0.2)' : 'rgba(111,125,149,0.2)',
                    color: vote.position === 'SUPPORT' ? '#2E8B57' : vote.position === 'OPPOSE' ? '#D95C4B' : '#6F7D95',
                  }}>{vote.position}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
