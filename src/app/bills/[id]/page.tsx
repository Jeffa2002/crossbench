import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import VoteButton from './vote-button';

export const revalidate = 60;

async function getBillResults(billId: string) {
  const votes = await prisma.vote.groupBy({
    by: ['position'],
    where: { billId },
    _count: true,
  });
  const total = votes.reduce((sum, v) => sum + v._count, 0);
  const support = votes.find(v => v.position === 'SUPPORT')?._count || 0;
  const oppose = votes.find(v => v.position === 'OPPOSE')?._count || 0;
  const abstain = votes.find(v => v.position === 'ABSTAIN')?._count || 0;
  return { total, support, oppose, abstain };
}

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { stages: { orderBy: { recordedAt: 'desc' } } },
  });

  if (!bill) notFound();

  const results = await getBillResults(bill.id);
  const supportPct = results.total > 0 ? Math.round((results.support / results.total) * 100) : 0;
  const opposePct = results.total > 0 ? Math.round((results.oppose / results.total) * 100) : 0;

  const session = await auth();
  let userVote = null;
  if (session?.user) {
    const existingVote = await prisma.vote.findUnique({
      where: { userId_billId: { userId: (session.user as any).id, billId: bill.id } },
    });
    userVote = existingVote?.position || null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">Crossbench</Link>
          {session?.user ? (
            <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900">My account</Link>
          ) : (
            <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Sign in to vote</Link>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/bills" className="text-sm text-blue-600 hover:underline mb-4 block">← Back to bills</Link>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{bill.chamber}</span>
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">{bill.status}</span>
            {bill.portfolio && <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded">{bill.portfolio}</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{bill.title}</h1>
          {bill.summary && <p className="text-gray-600 leading-relaxed mb-4">{bill.summary}</p>}
          {bill.sponsorName && <p className="text-sm text-gray-500">Sponsored by {bill.sponsorName}</p>}
          {bill.aphUrl && (
            <a href={bill.aphUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 block">
              View on APH website →
            </a>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Citizen votes {results.total > 0 && <span className="text-gray-400 font-normal text-base">({results.total.toLocaleString()} total)</span>}
          </h2>
          {results.total === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p className="text-lg mb-1">No votes yet</p>
              <p className="text-sm">Be the first to vote on this bill</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-green-700">Support</span>
                  <span className="text-gray-500">{results.support.toLocaleString()} ({supportPct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${supportPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-red-700">Oppose</span>
                  <span className="text-gray-500">{results.oppose.toLocaleString()} ({opposePct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${opposePct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-600">Abstain</span>
                  <span className="text-gray-500">{results.abstain.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            {session?.user ? (
              <VoteButton
                billId={bill.id}
                currentVote={userVote as any}
                isVerified={!!(session.user as any).verifiedAt}
              />
            ) : (
              <Link href={`/login?next=/bills/${bill.id}`} className="w-full block text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
                Sign in to cast your vote
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
