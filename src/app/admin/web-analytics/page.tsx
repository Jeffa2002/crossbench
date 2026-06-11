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
  IN: 'India',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  ID: 'Indonesia',
  MY: 'Malaysia',
  PH: 'Philippines',
  TH: 'Thailand',
  VN: 'Vietnam',
  BR: 'Brazil',
  MX: 'Mexico',
  ZA: 'South Africa',
  NL: 'Netherlands',
  IE: 'Ireland',
  IT: 'Italy',
  ES: 'Spain',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
};

const COUNTRY_POINTS: Record<string, [number, number]> = {
  AU: [134, -25], NZ: [172, -42], FR: [2, 47], US: [-98, 39], GB: [-2, 54], DE: [10, 51], CA: [-106, 57],
  SG: [104, 1], IN: [78, 22], CN: [104, 35], JP: [138, 37], KR: [128, 36], ID: [118, -2], MY: [102, 4],
  PH: [123, 13], TH: [101, 15], VN: [108, 16], BR: [-52, -10], MX: [-102, 23], ZA: [24, -29],
  NL: [5, 52], IE: [-8, 53], IT: [12, 43], ES: [-4, 40], SE: [15, 62], NO: [8, 61], FI: [26, 64],
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

function visitorLabel(type: string | null) {
  if (type === 'MP') return 'MPs';
  if (type === 'SENATOR') return 'Senators';
  if (type === 'REGISTERED') return 'Registered users';
  return 'Guests';
}

function visitorTone(type: string | null) {
  if (type === 'MP') return 'bg-purple-500';
  if (type === 'SENATOR') return 'bg-blue-400';
  if (type === 'REGISTERED') return 'bg-[#2E8B57]';
  return 'bg-[#7E8AA3]';
}

function mapPoint(code: string | null) {
  if (!code || !COUNTRY_POINTS[code]) return null;
  const [lon, lat] = COUNTRY_POINTS[code];
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 460,
  };
}

function WorldTrafficMap({ rows }: { rows: Array<{ countryCode: string | null; _count: { _all: number } }> }) {
  const max = Math.max(1, ...rows.map(row => row._count._all));
  const plotted = rows
    .map(row => ({ ...row, point: mapPoint(row.countryCode) }))
    .filter((row): row is typeof row & { point: { x: number; y: number } } => Boolean(row.point));

  return (
    <svg viewBox="0 0 1000 460" className="w-full h-auto" role="img" aria-label="World traffic map">
      <rect x="0" y="0" width="1000" height="460" rx="18" fill="#0B1220" />
      <g fill="#16213A" stroke="#25324D" strokeWidth="1.5" opacity="0.95">
        <path d="M150 110 C115 125 92 160 102 202 C112 246 150 258 174 300 C194 334 208 380 250 392 C285 402 306 370 296 333 C286 295 315 268 330 235 C350 192 324 151 288 126 C250 98 190 94 150 110Z" />
        <path d="M280 72 C330 42 405 46 466 78 C510 101 530 142 505 176 C480 210 418 191 380 216 C340 242 314 220 318 180 C322 137 240 105 280 72Z" />
        <path d="M455 134 C492 110 552 111 598 138 C625 154 624 189 596 203 C558 222 520 214 486 236 C458 254 425 230 430 194 C433 169 434 150 455 134Z" />
        <path d="M548 224 C585 198 635 216 650 260 C665 302 646 365 608 392 C575 416 536 398 528 354 C520 310 512 250 548 224Z" />
        <path d="M615 90 C700 54 812 72 882 126 C938 170 922 230 850 240 C780 250 745 208 692 226 C640 244 584 216 596 160 C602 130 595 104 615 90Z" />
        <path d="M742 258 C790 240 856 254 902 292 C940 323 918 370 865 372 C812 374 765 357 735 324 C710 296 712 270 742 258Z" />
      </g>
      <g>
        {plotted.map(row => {
          const strength = row._count._all / max;
          const radius = 7 + Math.round(strength * 22);
          const opacity = 0.35 + strength * 0.6;
          return (
            <g key={row.countryCode}>
              <circle cx={row.point.x} cy={row.point.y} r={radius + 8} fill="#D6A94A" opacity={opacity * 0.16} />
              <circle cx={row.point.x} cy={row.point.y} r={radius} fill="#D6A94A" opacity={opacity} />
              <text x={row.point.x} y={row.point.y - radius - 8} fill="#F5F7FB" fontSize="18" textAnchor="middle" fontWeight="700">
                {row.countryCode}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
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
    visitorRows,
    mapCountryRows,
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
      _count: { _all: true, countryCode: true },
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
    prisma.webVisitSession.groupBy({
      by: ['visitorType'],
      where: { startedAt: { gte: since24h } },
      _count: { _all: true },
      orderBy: { _count: { visitorType: 'desc' } },
    }),
    prisma.webVisitSession.groupBy({
      by: ['countryCode'],
      where: { startedAt: { gte: since7d }, countryCode: { not: null } },
      _count: { _all: true, countryCode: true },
      orderBy: { _count: { countryCode: 'desc' } },
      take: 40,
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
  const visitorTotal = visitorRows.reduce((sum, row) => sum + row._count._all, 0);

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
        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-[#25324D] flex items-center justify-between gap-3">
            <h2 className="font-bold">World traffic strength, 7d</h2>
            <span className="text-xs text-[#7E8AA3]">Darker gold means more sessions</span>
          </div>
          <div className="p-4">
            <WorldTrafficMap rows={mapCountryRows} />
          </div>
        </section>

        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Audience type, 24h</h2>
          </div>
          <div className="p-4 space-y-3">
            {['GUEST', 'REGISTERED', 'MP', 'SENATOR'].map(type => {
              const row = visitorRows.find(item => (item.visitorType || 'GUEST') === type);
              const count = row?._count._all ?? 0;
              const pct = visitorTotal > 0 ? Math.round((count / visitorTotal) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#B6C0D1]">{visitorLabel(type)}</span>
                    <span className="text-[#F5F7FB] font-bold">{count.toLocaleString()} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-[#16213A] rounded-full overflow-hidden">
                    <div className={`h-full ${visitorTone(type)}`} style={{ width: `${count > 0 ? Math.max(4, pct) : 0}%` }} />
                  </div>
                </div>
              );
            })}
            {visitorTotal === 0 && <p className="text-sm text-[#4E5A73]">No audience classification yet.</p>}
          </div>
        </section>
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
                  <span className="text-[#F5F7FB] font-bold">{row._count._all}</span>
                </div>
                <div className="h-2 bg-[#16213A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2E8B57]" style={{ width: `${sessions24h > 0 ? Math.max(4, Math.round((row._count._all / sessions24h) * 100)) : 0}%` }} />
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
