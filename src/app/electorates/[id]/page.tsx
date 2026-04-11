import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 300;

const PARTY_COLORS: Record<string, string> = {
  labor: '#E53E3E',
  liberal: '#3182CE',
  national: '#38A169',
  greens: '#48BB78',
  independent: '#805AD5',
  teal: '#319795',
  'one nation': '#F6AD55',
  'united australia': '#D69E2E',
  katter: '#B7791F',
};

function getPartyColor(party: string | null) {
  if (!party) return '#6F7D95';
  const p = party.toLowerCase();
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (p.includes(key)) return color;
  }
  return '#6F7D95';
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T extends Record<string, any>>(value: unknown): T | null {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : null;
  } catch {
    return null;
  }
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function SocialButton({ href, label, symbol }: { href: string; label: string; symbol: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '12px',
        backgroundColor: '#0E1628',
        border: '1px solid #1C2940',
        color: '#F5F7FB',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      <span>{symbol}</span>
      <span>{label}</span>
    </a>
  );
}

export default async function ElectoratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const electorate = await prisma.electorate.findUnique({ where: { id } }) as any;
  if (!electorate) notFound();

  const profileRows = await prisma.$queryRaw`
    SELECT * FROM "MpProfile" WHERE "electorateId" = ${id}
  ` as any[];
  const profile = profileRows[0] || null;

  const partyColor = getPartyColor(electorate.mpParty);
  const isHouse = electorate.mpChamber === 'House of Reps';
  const name = electorate.mpName || electorate.name;

  const portfolios = parseJsonArray<string>(profile?.portfolios);
  const committees = parseJsonArray<string>(profile?.committees);
  const newsHeadlines = parseJsonArray<any>(profile?.newsHeadlines).slice(0, 8);
  const socialLinks = parseJsonObject<{ twitter?: string; facebook?: string; youtube?: string; website?: string }>(profile?.socialLinks) || {};

  const votesByBill = await prisma.vote.groupBy({
    by: ['billId', 'position'],
    where: { electorateId: id },
    _count: true,
  });

  const billVoteCounts: Record<string, number> = {};
  votesByBill.forEach(r => { billVoteCounts[r.billId] = (billVoteCounts[r.billId] || 0) + r._count; });
  const sortedBillIds = Object.entries(billVoteCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([billId]) => billId);

  const bills = sortedBillIds.length > 0
    ? await prisma.bill.findMany({
        where: { id: { in: sortedBillIds } },
        select: { id: true, title: true, chamber: true, status: true },
      })
    : [];

  const nationalStats = sortedBillIds.length > 0
    ? await prisma.vote.groupBy({
        by: ['billId', 'position'],
        where: { billId: { in: sortedBillIds } },
        _count: true,
      })
    : [];

  const totalElect = Object.values(billVoteCounts).reduce((s, n) => s + n, 0);
  const supportCount = votesByBill.filter(r => r.position === 'SUPPORT').reduce((s, r) => s + r._count, 0);
  const opposeCount = votesByBill.filter(r => r.position === 'OPPOSE').reduce((s, r) => s + r._count, 0);
  const abstainCount = votesByBill.filter(r => r.position === 'ABSTAIN').reduce((s, r) => s + r._count, 0);

  function getPositions(billId: string, source: typeof votesByBill) {
    const rows = source.filter(r => r.billId === billId);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const get = (pos: string) => rows.find(r => r.position === pos)?._count || 0;
    const pct = (pos: string) => total > 0 ? Math.round((get(pos) / total) * 100) : 0;
    return { total, supportPct: pct('SUPPORT'), opposePct: pct('OPPOSE'), abstainPct: pct('ABSTAIN') };
  }

  const billMap = Object.fromEntries(bills.map(b => [b.id, b]));

  const profileCards = [
    hasText(profile?.birthDate) || hasText(profile?.birthPlace)
      ? { label: 'Born', value: [profile?.birthDate, profile?.birthPlace].filter(Boolean).join(' · ') }
      : null,
    hasText(profile?.firstElected) ? { label: 'First elected', value: profile.firstElected } : null,
    hasText(profile?.profession) ? { label: 'Profession', value: profile.profession } : null,
    hasText(profile?.education) ? { label: 'Education', value: profile.education } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <main style={{ backgroundColor: '#070D1A', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div className='page-container'>
        <Link href="/electorates" style={{ color: '#4E8FD4', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← All electorates
        </Link>

        <section style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {electorate.mpPhotoUrl && (
              <img src={electorate.mpPhotoUrl} alt={name || ''} style={{ width: '132px', height: '168px', borderRadius: '14px', objectFit: 'cover', objectPosition: 'top', border: '1px solid #1C2940', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#F5F7FB', lineHeight: 1.1 }}>{name}</h1>
                  {hasText(profile?.shortBio) && <p style={{ margin: '10px 0 0', color: '#7E8AA3', fontSize: '15px', lineHeight: 1.6, maxWidth: '62rem' }}>{profile.shortBio}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {electorate.mpParty && <span style={{ backgroundColor: `${partyColor}22`, color: partyColor, border: `1px solid ${partyColor}55`, padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>{electorate.mpParty}</span>}
                  <span style={{ backgroundColor: 'rgba(78,143,212,0.14)', color: '#4E8FD4', border: '1px solid rgba(78,143,212,0.28)', padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>{isHouse ? 'House of Reps' : 'Senate'}</span>
                  <span style={{ backgroundColor: '#111A2E', color: '#7E8AA3', border: '1px solid #1C2940', padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>{electorate.name} · {electorate.state}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
                {profile?.aphBioUrl && <Link href={profile.aphBioUrl} target="_blank" style={{ color: '#4E8FD4', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>Official APH Profile →</Link>}
                {electorate.mpId && <Link href={`/mp/${electorate.mpId}`} style={{ color: '#4E8FD4', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>Full MP profile →</Link>}
                {electorate.mpEmail && <a href={`mailto:${electorate.mpEmail}`} style={{ color: '#7E8AA3', textDecoration: 'none', fontSize: '13px' }}>✉ {electorate.mpEmail}</a>}
              </div>
            </div>
          </div>
        </section>

        {profileCards.length > 0 && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {profileCards.map(card => (
              <div key={card.label} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '16px' }}>
                <div style={{ color: '#7E8AA3', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{card.label}</div>
                <div style={{ color: '#F5F7FB', fontSize: '14px', lineHeight: 1.5 }}>{card.value}</div>
              </div>
            ))}
          </section>
        )}

        {(hasText(profile?.longBio) || portfolios.length > 0 || committees.length > 0 || newsHeadlines.length > 0 || hasText(profile?.hobbies) || Object.values(socialLinks).some(Boolean)) && (
          <section style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
            {hasText(profile?.longBio) && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 800 }}>About {name}</h2>
                <p style={{ margin: 0, color: '#F5F7FB', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile.longBio}</p>
              </div>
            )}

            {portfolios.length > 0 && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800 }}>Portfolios / Roles</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {portfolios.map((item, i) => <span key={`${item}-${i}`} style={{ padding: '8px 12px', borderRadius: '999px', backgroundColor: 'rgba(78,143,212,0.12)', border: '1px solid rgba(78,143,212,0.24)', color: '#F5F7FB', fontSize: '13px' }}>{item}</span>)}
                </div>
              </div>
            )}

            {committees.length > 0 && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800 }}>Committees</h2>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#F5F7FB', lineHeight: 1.75 }}>
                  {committees.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
                </ul>
              </div>
            )}

            {hasText(profile?.hobbies) && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 800 }}>Interests</h2>
                <p style={{ margin: 0, color: '#7E8AA3', lineHeight: 1.7 }}>{profile.hobbies}</p>
              </div>
            )}

            {Object.values(socialLinks).some(Boolean) && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800 }}>Links</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {socialLinks.twitter && <SocialButton href={socialLinks.twitter} label="X / Twitter" symbol="𝕏" />}
                  {socialLinks.facebook && <SocialButton href={socialLinks.facebook} label="Facebook" symbol="f" />}
                  {socialLinks.youtube && <SocialButton href={socialLinks.youtube} label="YouTube" symbol="▶" />}
                  {socialLinks.website && <SocialButton href={socialLinks.website} label="Website" symbol="↗" />}
                  {profile?.aphBioUrl && <SocialButton href={profile.aphBioUrl} label="Official APH Profile" symbol="◎" />}
                </div>
              </div>
            )}

            {newsHeadlines.length > 0 && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800 }}>In the news</h2>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {newsHeadlines.map((item: any, i: number) => (
                    <article key={`${item.title || 'headline'}-${i}`} style={{ backgroundColor: '#111A2E', border: '1px solid #1C2940', borderRadius: '12px', padding: '16px' }}>
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#F5F7FB', textDecoration: 'none', fontWeight: 700, lineHeight: 1.5, display: 'block' }}>
                        {item.title}
                      </a>
                      <div style={{ color: '#7E8AA3', fontSize: '12px', marginTop: '6px' }}>{item.source}{item.date ? ` · ${item.date}` : ''}</div>
                      {item.snippet && <p style={{ color: '#F5F7FB', margin: '10px 0 0', lineHeight: 1.65 }}>{item.snippet}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 6px' }}>
            How {isHouse ? electorate.name : (electorate.mpName || electorate.name)} is voting
          </h2>
          <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 18px' }}>
            {isHouse ? 'Across all bills on Crossbench' : `Senator for ${electorate.state} · Across all bills on Crossbench`}
            {totalElect > 0 && ` — ${totalElect.toLocaleString()} votes total`}
          </p>

          {totalElect === 0 ? (
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
              No votes from this electorate yet.{' '}
              <Link href="/bills" style={{ color: '#4E8FD4', textDecoration: 'none' }}>Be the first →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Support', count: supportCount, color: '#4E8FD4' },
                { label: 'Oppose', count: opposeCount, color: '#D95C4B' },
                { label: 'Abstain', count: abstainCount, color: '#6F7D95' },
              ].map(({ label, count, color }) => {
                const pct = totalElect > 0 ? Math.round((count / totalElect) * 100) : 0;
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</span>
                      <span style={{ fontSize: '13px', color: '#7E8AA3' }}>{count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#16213A', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sortedBillIds.length > 0 && (
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 12px' }}>
              {isHouse ? electorate.name : (electorate.mpName || electorate.name)} vs Australia — by bill
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedBillIds.map(billId => {
                const bill = billMap[billId];
                if (!bill) return null;
                const elect = getPositions(billId, votesByBill);
                const natl = getPositions(billId, nationalStats);

                const dominantLabel = elect.supportPct >= elect.opposePct && elect.supportPct >= elect.abstainPct ? 'Support'
                  : elect.opposePct >= elect.abstainPct ? 'Oppose' : 'Abstain';
                const natlLabel = natl.supportPct >= natl.opposePct && natl.supportPct >= natl.abstainPct ? 'Support'
                  : natl.opposePct >= natl.abstainPct ? 'Oppose' : 'Abstain';
                const aligned = dominantLabel === natlLabel;

                return (
                  <div key={billId} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                      <Link href={`/bills/${billId}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 4px', lineHeight: 1.4 }}>{bill.title}</p>
                        <p style={{ fontSize: '11px', color: '#7E8AA3', margin: 0 }}>{bill.status} · {elect.total} votes in this electorate</p>
                      </Link>
                      <span style={{
                        flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                        backgroundColor: aligned ? 'rgba(78,143,212,0.15)' : 'rgba(217,92,75,0.15)',
                        color: aligned ? '#4E8FD4' : '#D95C4B',
                        border: `1px solid ${aligned ? 'rgba(78,143,212,0.28)' : 'rgba(217,92,75,0.28)'}`
                      }}>
                        {aligned ? '≈ Aligned' : '≠ Diverges'}
                      </span>
                    </div>

                    <div className='compare-grid'>
                      {[
                        { label: `📍 ${isHouse ? electorate.name : (electorate.mpName || electorate.name)}`, data: elect },
                        { label: '🇦🇺 National', data: natl },
                      ].map(({ label, data }) => (
                        <div key={label}>
                          <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                          {[
                            { pos: 'Support', pct: data.supportPct, color: '#4E8FD4' },
                            { pos: 'Oppose', pct: data.opposePct, color: '#D95C4B' },
                            { pos: 'Abstain', pct: data.abstainPct, color: '#6F7D95' },
                          ].map(({ pos, pct, color }) => (
                            <div key={pos} style={{ marginBottom: '5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ fontSize: '11px', color: '#7E8AA3' }}>{pos}</span>
                                <span style={{ fontSize: '11px', color, fontWeight: 600 }}>{pct}%</span>
                              </div>
                              <div style={{ height: '4px', backgroundColor: '#16213A', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '2px' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
