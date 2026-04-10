import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminMPs() {
  const mps = await prisma.user.findMany({
    where: { role: 'MP' },
    orderBy: { createdAt: 'desc' },
    include: {
      electorate: true,
      _count: { select: { votes: true } },
    },
  });

  const registered = mps.filter(m => m.emailVerified);
  const withSubscription = mps.filter(m => m.subscriptionStatus === 'ACTIVE');
  const onTrial = mps.filter(m => m.subscriptionStatus === 'TRIAL');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MPs</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">{mps.length} MP accounts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total MP accounts', value: mps.length },
          { label: 'Email verified', value: registered.length },
          { label: 'Active subscription', value: withSubscription.length },
          { label: 'On trial', value: onTrial.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4">
            <div className="text-2xl font-bold text-[#F5F7FB]">{value}</div>
            <div className="text-xs text-[#7E8AA3] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Electorate</th>
              <th className="text-left px-4 py-3">State</th>
              <th className="text-left px-4 py-3">Email verified</th>
              <th className="text-left px-4 py-3">Subscription</th>
              <th className="text-left px-4 py-3">Trial ends</th>
              <th className="text-left px-4 py-3">Votes cast</th>
            </tr>
          </thead>
          <tbody>
            {mps.map(mp => (
              <tr key={mp.id} className="border-b border-[#1A2640] hover:bg-[#16213A] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[#B6C0D1]">{mp.email}</td>
                <td className="px-4 py-3 text-xs text-[#B6C0D1]">{mp.electorate?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[#7E8AA3]">{mp.electorate?.state ?? '—'}</td>
                <td className="px-4 py-3">
                  {mp.emailVerified
                    ? <span className="text-green-400 text-xs">✓</span>
                    : <span className="text-[#4E5A73] text-xs">Not yet</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    mp.subscriptionStatus === 'ACTIVE' ? 'bg-green-900/40 text-green-300' :
                    mp.subscriptionStatus === 'TRIAL' ? 'bg-blue-900/40 text-blue-300' :
                    mp.subscriptionStatus === 'PAST_DUE' ? 'bg-red-900/40 text-red-300' :
                    'bg-[#16213A] text-[#7E8AA3]'
                  }`}>{mp.subscriptionStatus}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[#4E5A73]">
                  {mp.trialEndsAt ? new Date(mp.trialEndsAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-[#B6C0D1]">{mp._count.votes}</td>
              </tr>
            ))}
            {mps.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#4E5A73]">No MP accounts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
