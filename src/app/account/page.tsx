import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/account');
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      electorate: true,
      votes: { orderBy: { createdAt: 'desc' }, take: 10, include: { bill: { select: { id: true, title: true } } } },
    },
  });
  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">Crossbench</Link>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Electorate verification</h2>
          {user.verifiedAt && user.electorate ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">Verified — {user.electorate.name}</p>
                <p className="text-sm text-gray-500">{user.electorate.state}{user.electorate.mpName ? ` · ${user.electorate.mpName}` : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-medium text-gray-900">Not verified</p>
                  <p className="text-sm text-gray-500">Verify your address to vote on bills</p>
                </div>
              </div>
              <Link href="/account/verify" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Verify now →</Link>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your votes</h2>
          {user.votes.length === 0 ? (
            <p className="text-gray-500 text-sm">No votes yet. <Link href="/bills" className="text-blue-600 hover:underline">Browse bills →</Link></p>
          ) : (
            <div className="space-y-3">
              {user.votes.map(vote => (
                <Link key={vote.id} href={`/bills/${vote.bill.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                  <span className="text-sm text-gray-800 line-clamp-1 flex-1 mr-4">{vote.bill.title}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${vote.position === 'SUPPORT' ? 'bg-green-100 text-green-700' : vote.position === 'OPPOSE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{vote.position}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
