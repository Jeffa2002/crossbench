import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminBills() {
  const bills = await prisma.bill.findMany({
    orderBy: { votes: { _count: 'desc' } },
    include: {
      _count: { select: { votes: true } },
      votes: {
        select: { position: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bills</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">{bills.length} bills in database</p>
      </div>

      <div className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Total votes</th>
              <th className="text-left px-4 py-3">Support</th>
              <th className="text-left px-4 py-3">Oppose</th>
              <th className="text-left px-4 py-3">Abstain</th>
              <th className="text-left px-4 py-3">AI summary</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(b => {
              const support = b.votes.filter(v => v.position === 'SUPPORT').length;
              const oppose = b.votes.filter(v => v.position === 'OPPOSE').length;
              const abstain = b.votes.filter(v => v.position === 'ABSTAIN').length;
              const total = b._count.votes;
              return (
                <tr key={b.id} className="border-b border-[#1A2640] hover:bg-[#16213A] transition-colors">
                  <td className="px-4 py-3 max-w-[280px]">
                    <a href={`/bills/${b.id}`} target="_blank" className="text-[#B6C0D1] hover:text-[#2E8B57] text-xs leading-snug line-clamp-2">
                      {b.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7E8AA3]">{b.status ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-[#F5F7FB]">{total}</td>
                  <td className="px-4 py-3 text-xs text-green-400">{support}</td>
                  <td className="px-4 py-3 text-xs text-red-400">{oppose}</td>
                  <td className="px-4 py-3 text-xs text-yellow-400">{abstain}</td>
                  <td className="px-4 py-3">
                    {(b as any).aiSummary
                      ? <span className="text-green-400 text-xs">✓</span>
                      : <span className="text-[#4E5A73] text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
