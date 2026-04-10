import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const [
    totalUsers, verifiedUsers, mpUsers,
    totalVotes, commentedVotes, totalBills,
    recentUsers, topBills, recentVotes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { verifiedAt: { not: null } } }),
    prisma.user.count({ where: { role: 'MP' } }),
    prisma.vote.count(),
    prisma.vote.count({ where: { comment: { not: null } } }),
    prisma.bill.count(),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { electorate: true } }),
    prisma.bill.findMany({
      orderBy: { votes: { _count: 'desc' } },
      take: 5,
      include: { _count: { select: { votes: true } } },
    }),
    prisma.vote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true, bill: true },
    }),
  ]);

  const engagementRate = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">Live data from production</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total users', value: totalUsers },
          { label: 'Verified', value: verifiedUsers },
          { label: 'Engagement', value: `${engagementRate}%` },
          { label: 'MPs registered', value: mpUsers },
          { label: 'Total votes', value: totalVotes },
          { label: 'With comments', value: commentedVotes },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4">
            <div className="text-2xl font-bold text-[#F5F7FB]">{value}</div>
            <div className="text-xs text-[#7E8AA3] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent signups */}
        <div className="bg-[#111A2E] border border-[#25324D] rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent signups</h2>
            <Link href="/admin/users" className="text-xs text-[#2E8B57] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-[#F5F7FB] truncate max-w-[160px]">{u.email}</div>
                  <div className="text-xs text-[#4E5A73]">{u.electorate?.name ?? 'unverified'}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'MP' ? 'bg-purple-900/40 text-purple-300' : 'bg-[#16213A] text-[#7E8AA3]'}`}>
                  {u.role}
                </span>
              </div>
            ))}
            {recentUsers.length === 0 && <div className="text-sm text-[#4E5A73]">No users yet</div>}
          </div>
        </div>

        {/* Top bills by votes */}
        <div className="bg-[#111A2E] border border-[#25324D] rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Most voted bills</h2>
            <Link href="/admin/bills" className="text-xs text-[#2E8B57] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {topBills.map(b => (
              <div key={b.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="text-[#B6C0D1] truncate max-w-[180px] text-xs leading-snug">{b.title}</div>
                <span className="text-xs text-[#2E8B57] font-bold whitespace-nowrap">{b._count.votes} votes</span>
              </div>
            ))}
            {topBills.length === 0 && <div className="text-sm text-[#4E5A73]">No votes yet</div>}
          </div>
        </div>

        {/* Recent votes */}
        <div className="bg-[#111A2E] border border-[#25324D] rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent votes</h2>
            <Link href="/admin/votes" className="text-xs text-[#2E8B57] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentVotes.map(v => (
              <div key={v.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#B6C0D1] truncate max-w-[140px] text-xs">{v.user.email}</span>
                  <span className={`text-xs font-bold ${v.position === 'SUPPORT' ? 'text-green-400' : v.position === 'OPPOSE' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {v.position}
                  </span>
                </div>
                <div className="text-[11px] text-[#4E5A73] truncate">{v.bill.title}</div>
              </div>
            ))}
            {recentVotes.length === 0 && <div className="text-sm text-[#4E5A73]">No votes yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
