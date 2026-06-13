import { prisma } from '@/lib/prisma';
import { addressVerifiedUserWhere } from '@/lib/verification';

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

type SessionWithViews = Awaited<ReturnType<typeof loadSessionsRange>>[number];

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

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function safeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

function pathOnly(value: string | null | undefined) {
  if (!value) return '/';
  try {
    return new URL(value, 'https://crossbench.io').pathname;
  } catch {
    return value.split('?')[0] || '/';
  }
}

function pathParams(value: string | null | undefined) {
  try {
    return new URL(value || '/', 'https://crossbench.io').searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function referrerHost(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function groupReferrer(host: string | null) {
  if (!host) return 'Direct / none';
  if (/google\./i.test(host)) return 'Google';
  if (/facebook\.com|instagram\.com|fb\.me/i.test(host)) return 'Meta';
  if (/x\.com|twitter\.com|t\.co/i.test(host)) return 'X / Twitter';
  if (/linkedin\.com/i.test(host)) return 'LinkedIn';
  if (/aph\.gov\.au|parlinfo/i.test(host)) return 'APH / Parliament';
  if (/news|abc\.net\.au|smh\.com\.au|theage\.com\.au|theguardian\.com|skynews|nine\.com\.au|news\.com\.au/i.test(host)) return 'Media';
  if (/crossbench\.io/i.test(host)) return 'Internal';
  return host;
}

function campaignFor(session: Pick<SessionWithViews, 'firstPath' | 'referrer' | 'deviceType'>) {
  const params = pathParams(session.firstPath);
  const utmCampaign = params.get('utm_campaign') || params.get('campaign');
  const utmSource = params.get('utm_source') || params.get('source');
  const utmMedium = params.get('utm_medium') || params.get('medium');
  const host = referrerHost(session.referrer);

  if (utmCampaign || utmSource || utmMedium) {
    return {
      label: utmCampaign || utmSource || 'Tagged campaign',
      source: utmSource || groupReferrer(host),
      medium: utmMedium || 'tagged',
    };
  }
  if (session.deviceType === 'bot') return { label: 'Bot / crawler', source: 'Bot', medium: 'crawler' };
  return { label: groupReferrer(host), source: groupReferrer(host), medium: host ? 'referral' : 'direct' };
}

function pageCategory(path: string | null | undefined) {
  const clean = pathOnly(path);
  if (clean === '/') return 'Home';
  if (clean === '/login' || clean === '/verify-email') return 'Auth';
  if (clean === '/account/verify') return 'Address verification';
  if (clean.startsWith('/mp-dashboard')) return 'MP dashboard';
  if (clean.startsWith('/mp-updates')) return 'MP updates';
  if (clean.startsWith('/for-mps') || clean.startsWith('/mp-demo')) return 'MP funnel';
  if (clean === '/bills' || clean.startsWith('/bills/')) return 'Bills';
  if (clean.startsWith('/electorates') || clean.startsWith('/mp/')) return 'Electorates and MPs';
  if (clean === '/sentiment') return 'Sentiment';
  if (clean === '/support') return 'Support';
  if (clean === '/about' || clean === '/methodology' || clean === '/privacy' || clean === '/terms') return 'Trust content';
  return 'Other';
}

function addCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function topRows(map: Map<string, number>, limit = 10) {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

async function resolveRange(searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> | undefined) {
  const params = await Promise.resolve(searchParams || {});
  const now = new Date();
  const selected = firstParam(params.range) || '7d';
  const from = firstParam(params.from);
  const to = firstParam(params.to);

  if (selected === 'custom') {
    const start = parseDateInput(from);
    const end = parseDateInput(to, true);
    if (start && end && start < end) {
      const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
      return {
        key: 'custom',
        label: `${dateInputValue(start)} to ${dateInputValue(new Date(end.getTime() - 1))}`,
        shortLabel: 'custom range',
        start,
        end,
        previousStart,
        from: dateInputValue(start),
        to: dateInputValue(new Date(end.getTime() - 1)),
      };
    }
  }

  const days = selected === '90d' ? 90 : selected === '30d' ? 30 : 7;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    key: `${days}d`,
    label: `${days} days`,
    shortLabel: `${days}d`,
    start,
    end: now,
    previousStart,
    from: dateInputValue(start),
    to: dateInputValue(now),
  };
}

function RangeSelector({ range }: { range: Awaited<ReturnType<typeof resolveRange>> }) {
  const presets = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
  ];

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-xl border border-[#25324D] bg-[#111A2E] p-1">
        {presets.map(item => (
          <a
            key={item.key}
            href={`/admin/web-analytics?range=${item.key}`}
            className={`rounded-lg px-3 py-2 text-sm font-bold no-underline ${range.key === item.key ? 'bg-[#D6A94A] text-[#0B1220]' : 'text-[#7E8AA3]'}`}
          >
            {item.label}
          </a>
        ))}
      </div>
      <form action="/admin/web-analytics" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="range" value="custom" />
        <input name="from" type="date" defaultValue={range.from} className="rounded-lg border border-[#25324D] bg-[#111A2E] px-3 py-2 text-sm text-[#F5F7FB]" />
        <span className="text-sm text-[#4E5A73]">to</span>
        <input name="to" type="date" defaultValue={range.to} className="rounded-lg border border-[#25324D] bg-[#111A2E] px-3 py-2 text-sm text-[#F5F7FB]" />
        <button type="submit" className={`rounded-lg border px-3 py-2 text-sm font-bold ${range.key === 'custom' ? 'border-[#D6A94A] bg-[#D6A94A] text-[#0B1220]' : 'border-[#25324D] bg-[#16213A] text-[#F5F7FB]'}`}>
          Apply
        </button>
      </form>
    </div>
  );
}

function mapPoint(code: string | null) {
  if (!code || !COUNTRY_POINTS[code]) return null;
  const [lon, lat] = COUNTRY_POINTS[code];
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 460,
  };
}

async function loadSessionsRange(start: Date, end: Date) {
  return prisma.webVisitSession.findMany({
    where: { startedAt: { gte: start, lt: end } },
    orderBy: { lastSeenAt: 'desc' },
    take: 1500,
    include: { pageViews: { orderBy: { startedAt: 'asc' }, take: 80 } },
  });
}

function WorldTrafficMap({ rows }: { rows: Array<{ countryCode: string | null; _count: { _all: number } }> }) {
  const max = Math.max(1, ...rows.map(row => row._count._all));
  const plotted = rows
    .map(row => ({ ...row, point: mapPoint(row.countryCode) }))
    .filter((row): row is typeof row & { point: { x: number; y: number } } => Boolean(row.point));

  return (
    <svg viewBox="0 0 1000 460" className="w-full h-auto" role="img" aria-label="World traffic map">
      <image href="/world-map.svg" x="0" y="0" width="1000" height="460" preserveAspectRatio="xMidYMid meet" />
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

function MetricCard({ label, value, tone = 'text-[#F5F7FB]', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4">
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-[#7E8AA3] mt-1">{label}</div>
      {sub && <div className="text-[11px] text-[#4E5A73] mt-1">{sub}</div>}
    </div>
  );
}

function BarRow({ label, count, total, color = 'bg-[#2E8B57]', detail }: { label: string; count: number; total: number; color?: string; detail?: string }) {
  const width = total > 0 ? Math.max(4, pct(count, total)) : 0;
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm mb-1">
        <span className="text-[#B6C0D1] truncate">{label}</span>
        <span className="text-[#F5F7FB] font-bold whitespace-nowrap">{count.toLocaleString()}{detail ? ` · ${detail}` : ''}</span>
      </div>
      <div className="h-2 bg-[#16213A] rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#25324D]">
        <h2 className="font-bold">{title}</h2>
        {subtitle && <p className="text-xs text-[#7E8AA3] mt-1">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default async function AdminWebAnalyticsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }) {
  const range = await resolveRange(searchParams);
  const since24h = range.start;
  const previous24hStart = range.previousStart;
  const since7d = range.start;
  const rangeEnd = range.end;

  const [
    sessions24h,
    views24h,
    prevSessions24h,
    prevViews24h,
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
    sessions7dFull,
    newUsers7d,
    addressVerified7d,
    votes7d,
    mpNewsletterDeliveries7d,
  ] = await Promise.all([
    prisma.webVisitSession.count({ where: { startedAt: { gte: since24h, lt: rangeEnd } } }),
    prisma.webPageView.count({ where: { startedAt: { gte: since24h, lt: rangeEnd } } }),
    prisma.webVisitSession.count({ where: { startedAt: { gte: previous24hStart, lt: since24h } } }),
    prisma.webPageView.count({ where: { startedAt: { gte: previous24hStart, lt: since24h } } }),
    prisma.webVisitSession.count({ where: { startedAt: { gte: since7d, lt: rangeEnd } } }),
    prisma.webPageView.count({ where: { startedAt: { gte: since7d, lt: rangeEnd } } }),
    prisma.webPageView.aggregate({ where: { startedAt: { gte: since24h, lt: rangeEnd } }, _sum: { durationSeconds: true } }),
    prisma.webVisitSession.groupBy({
      by: ['countryCode'],
      where: { startedAt: { gte: since24h, lt: rangeEnd } },
      _count: { _all: true, countryCode: true },
      orderBy: { _count: { countryCode: 'desc' } },
      take: 12,
    }),
    prisma.webPageView.groupBy({
      by: ['path'],
      where: { startedAt: { gte: since24h, lt: rangeEnd } },
      _count: { path: true },
      _sum: { durationSeconds: true },
      orderBy: { _count: { path: 'desc' } },
      take: 15,
    }),
    prisma.webPageView.groupBy({
      by: ['referrer'],
      where: { startedAt: { gte: since24h, lt: rangeEnd }, referrer: { not: null } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: 12,
    }),
    prisma.webVisitSession.groupBy({
      by: ['visitorType'],
      where: { startedAt: { gte: since24h, lt: rangeEnd } },
      _count: { _all: true },
      orderBy: { _count: { visitorType: 'desc' } },
    }),
    prisma.webVisitSession.groupBy({
      by: ['countryCode'],
      where: { startedAt: { gte: since7d, lt: rangeEnd }, countryCode: { not: null } },
      _count: { _all: true, countryCode: true },
      orderBy: { _count: { countryCode: 'desc' } },
      take: 40,
    }),
    prisma.webVisitSession.count({ where: { startedAt: { gte: since24h, lt: rangeEnd }, countryCode: 'FR' } }),
    prisma.webPageView.count({ where: { startedAt: { gte: since24h, lt: rangeEnd }, session: { countryCode: 'FR' } } }),
    prisma.webVisitSession.findMany({
      where: { startedAt: { gte: since7d, lt: rangeEnd } },
      orderBy: { lastSeenAt: 'desc' },
      take: 30,
      include: { pageViews: { orderBy: { startedAt: 'desc' }, take: 6 } },
    }),
    loadSessionsRange(since7d, rangeEnd),
    prisma.user.count({ where: { createdAt: { gte: since7d, lt: rangeEnd } } }),
    prisma.user.count({ where: { ...addressVerifiedUserWhere, verifiedAt: { gte: since7d, lt: rangeEnd } } }),
    prisma.vote.count({ where: { createdAt: { gte: since7d, lt: rangeEnd } } }),
    prisma.mpNewsletterDelivery.count({ where: { sentAt: { gte: since7d, lt: rangeEnd }, status: 'SENT' } }),
  ]);

  const averageDuration = views24h > 0 ? Math.round((durationSum._sum.durationSeconds || 0) / views24h) : 0;
  const visitorTotal = visitorRows.reduce((sum, row) => sum + row._count._all, 0);
  const botSessions7d = sessions7dFull.filter(session => session.deviceType === 'bot').length;
  const suspiciousSessions7d = sessions7dFull.filter(session => session.pageViews.length >= 40 || session.deviceType === 'bot').length;
  const humanSessions7d = Math.max(0, sessions7dFull.length - botSessions7d);
  const mpOfficeSessions7d = sessions7dFull.filter(session => session.visitorType === 'MP' || session.visitorType === 'SENATOR').length;
  const signupIntent7d = sessions7dFull.filter(session => session.pageViews.some(view => pathOnly(view.path) === '/login')).length;
  const addressVerifyIntent7d = sessions7dFull.filter(session => session.pageViews.some(view => pathOnly(view.path) === '/account/verify')).length;
  const mpDashboardSessions7d = sessions7dFull.filter(session => session.pageViews.some(view => pathOnly(view.path).startsWith('/mp-dashboard'))).length;

  const campaignMap = new Map<string, { count: number; source: string; medium: string }>();
  const channelMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const australiaMap = new Map<string, number>();
  const billPageMap = new Map<string, number>();
  const conversionSourceMap = new Map<string, number>();
  const warmOfficeMap = new Map<string, number>();
  const referrerGroupMap = new Map<string, number>();

  for (const session of sessions7dFull) {
    const campaign = campaignFor(session);
    const key = campaign.label;
    const current = campaignMap.get(key) || { count: 0, source: campaign.source, medium: campaign.medium };
    campaignMap.set(key, { ...current, count: current.count + 1 });
    addCount(channelMap, campaign.source);
    addCount(referrerGroupMap, groupReferrer(referrerHost(session.referrer)));

    if (session.countryCode === 'AU') {
      addCount(australiaMap, [session.region, session.city].filter(Boolean).join(' / ') || 'Australia, unknown region');
    }

    if (session.visitorType === 'MP' || session.visitorType === 'SENATOR') {
      addCount(warmOfficeMap, `${visitorLabel(session.visitorType)} · ${session.lastPath || session.firstPath || 'unknown path'}`);
    }

    for (let index = 0; index < session.pageViews.length; index += 1) {
      const view = session.pageViews[index];
      const cleanPath = pathOnly(view.path);
      addCount(categoryMap, pageCategory(view.path));
      if (cleanPath.startsWith('/bills/') && cleanPath !== '/bills') addCount(billPageMap, cleanPath);
      if (cleanPath === '/login' || cleanPath === '/account/verify' || cleanPath.startsWith('/mp-dashboard')) {
        const previous = session.pageViews[index - 1]?.path || session.firstPath || 'Direct';
        addCount(conversionSourceMap, pathOnly(previous));
      }
    }
  }

  const campaignRows = [...campaignMap.entries()]
    .map(([label, data]) => ({ label, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const channelRows = topRows(channelMap, 8);
  const categoryRows = topRows(categoryMap, 10);
  const australiaRows = topRows(australiaMap, 10);
  const billRows = topRows(billPageMap, 10);
  const conversionRows = topRows(conversionSourceMap, 10);
  const warmOfficeRows = topRows(warmOfficeMap, 10);
  const referrerGroupRows = topRows(referrerGroupMap, 8);
  const sessionDelta = sessions24h - prevSessions24h;
  const viewDelta = views24h - prevViews24h;
  const exportHref = `/admin/web-analytics/export?range=${range.key}&from=${range.from}&to=${range.to}`;
  const goalRows = [
    { label: 'Signup intent', count: signupIntent7d, total: sessions7dFull.length, color: 'bg-[#D6A94A]' },
    { label: 'Address verification', count: addressVerified7d, total: Math.max(1, signupIntent7d), color: 'bg-[#2E8B57]' },
    { label: 'Votes recorded', count: votes7d, total: Math.max(1, addressVerified7d), color: 'bg-purple-500' },
    { label: 'MP/Senator sessions', count: mpOfficeSessions7d, total: sessions7dFull.length, color: 'bg-blue-400' },
    { label: 'MP dashboard sessions', count: mpDashboardSessions7d, total: Math.max(1, mpOfficeSessions7d), color: 'bg-purple-500' },
  ];
  const botRate = pct(botSessions7d, sessions7dFull.length);
  const alertRows = [
    ...(sessionDelta <= -5 ? [`Sessions are down ${Math.abs(sessionDelta).toLocaleString()} versus the previous equal range.`] : []),
    ...(viewDelta >= 20 ? [`Page views are up ${viewDelta.toLocaleString()} versus the previous equal range.`] : []),
    ...(botRate >= 20 ? [`Bot traffic is high at ${botRate}% of sessions.`] : []),
    ...(franceSessions >= 5 ? [`France traffic is elevated with ${franceSessions.toLocaleString()} sessions.`] : []),
    ...(signupIntent7d > 0 && newUsers7d === 0 ? ['Signup intent exists, but no new users were created in this range.'] : []),
  ];
  const segmentRows = [
    { label: 'Humans only', count: humanSessions7d, total: sessions7dFull.length, color: 'bg-[#2E8B57]' },
    { label: 'Australia', count: sessions7dFull.filter(session => session.countryCode === 'AU').length, total: sessions7dFull.length, color: 'bg-[#2E8B57]' },
    { label: 'MP/Senator office traffic', count: mpOfficeSessions7d, total: sessions7dFull.length, color: 'bg-purple-500' },
    { label: 'Campaign traffic', count: sessions7dFull.filter(session => campaignFor(session).medium !== 'direct' && campaignFor(session).source !== 'Bot').length, total: sessions7dFull.length, color: 'bg-[#D6A94A]' },
    { label: 'Bots/suspicious', count: suspiciousSessions7d, total: sessions7dFull.length, color: 'bg-[#F2A7A0]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Web Analyzer</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">First-party acquisition, funnel, content, geography, and traffic-quality analytics collected by Crossbench.</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <RangeSelector range={range} />
          <a href={exportHref} className="rounded-lg border border-[#25324D] bg-[#16213A] px-3 py-2 text-sm font-bold text-[#F5F7FB] no-underline">
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <MetricCard label={`Sessions, ${range.label}`} value={sessions24h.toLocaleString()} sub={`${sessionDelta >= 0 ? '+' : ''}${sessionDelta} vs previous range`} />
        <MetricCard label={`Page views, ${range.label}`} value={views24h.toLocaleString()} sub={`${viewDelta >= 0 ? '+' : ''}${viewDelta} vs previous range`} />
        <MetricCard label="Avg. time/page" value={fmtDuration(averageDuration)} tone="text-[#D6A94A]" />
        <MetricCard label={`Range activity, ${range.shortLabel}`} value={`${sessions7d.toLocaleString()} / ${views7d.toLocaleString()}`} sub="sessions / views" />
        <MetricCard label={`Traffic quality, ${range.shortLabel}`} value={`${pct(humanSessions7d, sessions7dFull.length)}% human`} sub={`${suspiciousSessions7d} bot/suspicious sessions`} tone={suspiciousSessions7d > 0 ? 'text-[#D6A94A]' : 'text-green-300'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <MetricCard label={`Signup intent, ${range.shortLabel}`} value={signupIntent7d.toLocaleString()} sub="sessions that reached sign-in" />
        <MetricCard label={`New users, ${range.shortLabel}`} value={newUsers7d.toLocaleString()} sub={`${pct(newUsers7d, Math.max(1, signupIntent7d))}% of signup-intent sessions`} />
        <MetricCard label={`Address verification, ${range.shortLabel}`} value={addressVerified7d.toLocaleString()} sub={`${addressVerifyIntent7d} sessions reached verification`} tone="text-[#2E8B57]" />
        <MetricCard label={`Votes, ${range.shortLabel}`} value={votes7d.toLocaleString()} sub="verified bill votes recorded" tone="text-[#D6A94A]" />
        <MetricCard label={`MP office warmth, ${range.shortLabel}`} value={mpOfficeSessions7d.toLocaleString()} sub={`${mpDashboardSessions7d} MP dashboard sessions`} tone="text-purple-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`Goal tracking, ${range.shortLabel}`} subtitle="Crossbench signup, verification, voting, and MP-office goals.">
          <div className="space-y-3">
            {goalRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={row.total} color={row.color} detail={`${pct(row.count, row.total)}%`} />)}
          </div>
        </Panel>

        <Panel title="Saved segments" subtitle="Fast-read segments for the selected range.">
          <div className="space-y-3">
            {segmentRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={row.total} color={row.color} detail={`${pct(row.count, row.total)}%`} />)}
          </div>
        </Panel>

        <Panel title="Bot and junk traffic" subtitle="Sessions that look automated or unusually noisy.">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">Bot sessions</span><span className="font-bold">{botSessions7d.toLocaleString()} · {botRate}%</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">Suspicious sessions</span><span className="font-bold">{suspiciousSessions7d.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">Human sessions</span><span className="font-bold">{humanSessions7d.toLocaleString()}</span></div>
          </div>
        </Panel>

        <Panel title="Alerts" subtitle="Automatic checks for the selected range.">
          <div className="space-y-2 text-sm">
            {alertRows.map(alert => <div key={alert} className="rounded-lg border border-[#5A4516] bg-[#2A220F] p-3 text-[#FDE68A]">{alert}</div>)}
            {alertRows.length === 0 && <p className="text-sm text-[#4E5A73]">No obvious anomalies in this range.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-[#25324D] flex items-center justify-between gap-3">
            <h2 className="font-bold">World traffic strength, {range.shortLabel}</h2>
            <span className="text-xs text-[#7E8AA3]">Darker gold means more sessions</span>
          </div>
          <div className="p-4">
            <WorldTrafficMap rows={mapCountryRows} />
          </div>
        </section>

        <Panel title={`Audience type, ${range.shortLabel}`}>
          <div className="space-y-3">
            {['GUEST', 'REGISTERED', 'MP', 'SENATOR'].map(type => {
              const row = visitorRows.find(item => (item.visitorType || 'GUEST') === type);
              const count = row?._count._all ?? 0;
              return <BarRow key={type} label={visitorLabel(type)} count={count} total={visitorTotal} color={visitorTone(type)} detail={`${pct(count, visitorTotal)}%`} />;
            })}
            {visitorTotal === 0 && <p className="text-sm text-[#4E5A73]">No audience classification yet.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`Acquisition channels, ${range.shortLabel}`} subtitle="Derived from UTM tags first, then referrer/source grouping.">
          <div className="space-y-3">
            {channelRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={sessions7dFull.length} color="bg-[#4E8FD4]" />)}
            {channelRows.length === 0 && <p className="text-sm text-[#4E5A73]">No acquisition data yet.</p>}
          </div>
        </Panel>

        <Panel title={`Campaign attribution, ${range.shortLabel}`} subtitle="UTM campaign/source links appear here automatically.">
          <div className="space-y-3">
            {campaignRows.map(row => (
              <div key={`${row.label}:${row.source}:${row.medium}`} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-[#B6C0D1] truncate">{row.label}</div>
                  <div className="text-[11px] text-[#4E5A73] truncate">{row.source} · {row.medium}</div>
                </div>
                <span className="text-[#F5F7FB] font-bold">{row.count}</span>
              </div>
            ))}
            {campaignRows.length === 0 && <p className="text-sm text-[#4E5A73]">No campaigns yet.</p>}
          </div>
        </Panel>

        <Panel title={`Referrer groups, ${range.shortLabel}`}>
          <div className="space-y-3">
            {referrerGroupRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={sessions7dFull.length} color="bg-[#D6A94A]" />)}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`Funnel source pages, ${range.shortLabel}`} subtitle="Pages immediately before sign-in, verification, or MP dashboard entry.">
          <div className="space-y-3">
            {conversionRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={sessions7dFull.length} color="bg-[#2E8B57]" />)}
            {conversionRows.length === 0 && <p className="text-sm text-[#4E5A73]">No funnel transitions yet.</p>}
          </div>
        </Panel>

        <Panel title={`Content categories, ${range.shortLabel}`}>
          <div className="space-y-3">
            {categoryRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={views7d} color="bg-purple-500" />)}
          </div>
        </Panel>

        <Panel title={`Australian geography, ${range.shortLabel}`} subtitle="Cloudflare city/region headers when present.">
          <div className="space-y-3">
            {australiaRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={sessions7dFull.filter(s => s.countryCode === 'AU').length} color="bg-[#2E8B57]" />)}
            {australiaRows.length === 0 && <p className="text-sm text-[#4E5A73]">No Australian regional data yet.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`Countries, ${range.shortLabel}`}>
          <div className="space-y-3">
            {countryRows.map(row => <BarRow key={row.countryCode || 'unknown'} label={countryName(row.countryCode)} count={row._count._all} total={sessions24h} />)}
            {countryRows.length === 0 && <p className="text-sm text-[#4E5A73]">No session country data yet.</p>}
          </div>
        </Panel>

        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Top pages, {range.shortLabel}</h2>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`Bill interest, ${range.shortLabel}`} subtitle="Bill detail pages by view volume.">
          <div className="space-y-3">
            {billRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={views7d} color="bg-[#D6A94A]" />)}
            {billRows.length === 0 && <p className="text-sm text-[#4E5A73]">No bill-detail traffic yet.</p>}
          </div>
        </Panel>

        <Panel title={`MP / office warm leads, ${range.shortLabel}`} subtitle="Authenticated APH/office sessions and last paths.">
          <div className="space-y-3">
            {warmOfficeRows.map(row => <BarRow key={row.label} label={row.label} count={row.count} total={Math.max(1, mpOfficeSessions7d)} color="bg-purple-500" />)}
            {warmOfficeRows.length === 0 && <p className="text-sm text-[#4E5A73]">No MP office sessions yet.</p>}
          </div>
        </Panel>

        <Panel title={`Outreach follow-through, ${range.shortLabel}`}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">MP update emails sent</span><span className="font-bold">{mpNewsletterDeliveries7d.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">MP/Senator web sessions</span><span className="font-bold">{mpOfficeSessions7d.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">MP dashboard sessions</span><span className="font-bold">{mpDashboardSessions7d.toLocaleString()}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#B6C0D1]">France anomaly</span><span className={franceSessions > 0 ? 'font-bold text-[#F2A7A0]' : 'font-bold text-green-300'}>{franceSessions} sessions / {franceViews} views</span></div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Top referrers, {range.shortLabel}</h2>
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
                  <span className="text-[#4E5A73]">{safeDate(session.lastSeenAt)?.toLocaleString('en-AU')}</span>
                </div>
                <div className="text-xs text-[#7E8AA3] mt-1">
                  {visitorLabel(session.visitorType)} · {session.deviceType || 'unknown'} · {session.browser || 'unknown'} · first {session.firstPath || '—'}
                </div>
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
