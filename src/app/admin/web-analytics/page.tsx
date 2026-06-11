import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia',
  FR: 'France',
  US: 'United States',
  GB: 'United Kingdom',
  NZ: 'New Zealand',
  SG: 'Singapore',
  DE: 'Germany',
  CA: 'Canada',
};

function countryName(code: string | null) {
  if (!code) return 'Unknown';
  return COUNTRY_NAMES[code] ? `${COUNTRY_NAMES[code]} (${code})` : code;
}

function fmtDuration(seconds: number | null | undefined) {
  const value = Math.max(0, Math.round(seconds || 0));
  if (value < 60) return `${value}s`;
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

export default async function AdminWebAnalyticsPage() {
  const since24h = new Date();
  since24h.setDate(since24h.getDate() - 1);
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);

  const [
    sessions24h,
    views24h,
    sessions7d,
    views7d,
    durationSum,
    countryRows,
    pageRows,
    referrerRows,
    franceSessions,
    franceViews,
    recentSessions,
  ] = await Promise.all([
    prisma.webVisitSession.count({ where: { startedAt: { gte: since24h } } }),
    prisma.webPageView.count({ where: { startedAt: { gte: since24h } } }),
    prisma.webVisitSession.count({ where: { startedAt: { gte: since7d } } }),
    prisma.webPageView.count({ where: { startedAt: { gte: since7d } } }),
    prisma.webPageView.aggregate({ where: { startedAt: { gte: since24h } }, _sum: { durationSeconds: true } }),
    prisma.webVisitSession.groupBy({
      by: ['countryCode'],
      where: { startedAt: { gte: since24h } },
      _count: { countryCode: true },
      orderBy: { _count: { countryCode: 'desc' } },
      take: 12,
    }),
    prisma.webPageView.groupBy({
      by: ['path'],
      where: { startedAt: { gte: since24h } },
      _count: { path: true },
      _sum: { durationSeconds: true },
      orderBy: { _count: { path: 'desc' } },
      take: 15,
    }),
    prisma.webPageView.groupBy({
      by: ['referrer'],
      where: { startedAt: { gte: since24h }, referrer: { not: null } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: 12,
    }),
    prisma.webVisitSession.count({ where: { startedAt: { gte: since24h }, countryCode: 'FR' } }),
    prisma.webPageView.count({ where: { startedAt: { gte: since24h }, session: { countryCode: 'FR' } } }),
    prisma.webVisitSession.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 30,
      include: { pageViews: { orderBy: { startedAt: 'desc' }, take: 6 } },
    }),
  ]);

  const averageDuration = views24h > 0 ? Math.round((durationSum._sum.durationSeconds || 0) / views24h) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Web Analyzer</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">First-party page/session analytics collected by Crossbench. Country data comes from Cloudflare headers when present.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Sessions, 24h', value: sessions24h.toLocaleString(), tone: 'text-[#F5F7FB]' },
          { label: 'Page views, 24h', value: views24h.toLocaleString(), tone: 'text-[#F5F7FB]' },
          { label: 'Avg. time/page', value: fmtDuration(averageDuration), tone: 'text-[#D6A94A]' },
          { label: '7d activity', value: `${sessions7d.toLocaleString()} / ${views7d.toLocaleString()}`, tone: 'text-[#B6C0D1]' },
          { label: 'France, 24h', value: `${franceSessions} sessions / ${franceViews} views`, tone: franceSessions > 0 ? 'text-[#F2A7A0]' : 'text-green-300' },
        ].map(item => (
          <div key={item.label} className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4">
            <div className={`text-xl font-bold ${item.tone}`}>{item.value}</div>
            <div className="text-xs text-[#7E8AA3] mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Countries, 24h</h2>
          </div>
          <div className="p-4 space-y-3">
            {countryRows.map(row => (
              <div key={row.countryCode || 'unknown'}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#B6C0D1]">{countryName(row.countryCode)}</span>
                  <span className="text-[#F5F7FB] font-bold">{row._count.countryCode}</span>
                </div>
                <div className="h-2 bg-[#16213A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2E8B57]" style={{ width: `${sessions24h > 0 ? Math.max(4, Math.round((row._count.countryCode / sessions24h) * 100)) : 0}%` }} />
                </div>
              </div>
            ))}
            {countryRows.length === 0 && <p className="text-sm text-[#4E5A73]">No session country data yet.</p>}
          </div>
        </section>

        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Top pages, 24h</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Page</th>
                  <th className="text-left px-4 py-3">Views</th>
                  <th className="text-left px-4 py-3">Avg. time</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(row => (
                  <tr key={row.path} className="border-b border-[#1A2640]">
                    <td className="px-4 py-3 text-[#B6C0D1] font-mono text-xs max-w-[520px] truncate">{row.path}</td>
                    <td className="px-4 py-3 text-[#F5F7FB] font-bold">{row._count.path}</td>
                    <td className="px-4 py-3 text-[#7E8AA3]">{fmtDuration(row._count.path > 0 ? Math.round((row._sum.durationSeconds || 0) / row._count.path) : 0)}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-[#4E5A73]">No page views yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Top referrers, 24h</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {referrerRows.map(row => (
                  <tr key={row.referrer || 'direct'} className="border-b border-[#1A2640]">
                    <td className="px-4 py-3 text-[#B6C0D1] text-xs max-w-[420px] truncate">{row.referrer || 'Direct'}</td>
                    <td className="px-4 py-3 text-[#F5F7FB] font-bold">{row._count.referrer}</td>
                  </tr>
                ))}
                {referrerRows.length === 0 && <tr><td className="px-4 py-8 text-center text-[#4E5A73]">No referrers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Recent sessions</h2>
          </div>
          <div className="divide-y divide-[#1A2640]">
            {recentSessions.map(session => (
              <div key={session.id} className="p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-[#F5F7FB] font-bold">{countryName(session.countryCode)}</span>
                  <span className="text-[#4E5A73]">{new Date(session.lastSeenAt).toLocaleString('en-AU')}</span>
                </div>
                <div className="text-xs text-[#7E8AA3] mt-1">{session.deviceType || 'unknown'} · {session.browser || 'unknown'} · first {session.firstPath || '—'}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {session.pageViews.map(view => (
                    <span key={view.id} className="text-[11px] text-[#B6C0D1] bg-[#16213A] rounded-full px-2 py-1">{view.path} · {fmtDuration(view.durationSeconds)}</span>
                  ))}
                </div>
              </div>
            ))}
            {recentSessions.length === 0 && <div className="px-4 py-8 text-center text-[#4E5A73] text-sm">No sessions yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
