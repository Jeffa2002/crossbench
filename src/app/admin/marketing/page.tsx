'use client';
import { useState } from 'react';
import Link from 'next/link';

type Tab = 'mps' | 'voters';
type Section = { title: string; icon: string; content: string | string[] | { label: string; value: string }[] };

const PARTY_COLORS: Record<string, string> = {
  'ALP': '#E53935', 'Labor': '#E53935',
  'Liberal': '#1565C0', 'LNP': '#1565C0',
  'Greens': '#2E7D32',
  'Nationals': '#795548',
  'Independent': '#7E8AA3',
  'One Nation': '#FF6F00',
  'Other': '#546E7A',
};

const MP_STRATEGY = {
  overview: "MPs and Senators are Crossbench's paid B2B customers. They get real-time constituent sentiment data — a unique product that no other platform offers. Target is 227 MPs + 76 Senators = 303 total. Priority: newly elected 48th parliament members still building their constituent intelligence.",
  phases: [
    { phase: "Phase 1 — Early Adopters (Now)", timeline: "Apr–Jun 2026", target: "Independents + minor parties", why: "Most motivated to understand constituents; no party machine giving them data", count: "~25 MPs", action: "Direct LinkedIn outreach + personalised electorate preview" },
    { phase: "Phase 2 — Labor Crossbench Risk", timeline: "Jul–Sep 2026", target: "Labor MPs in marginal seats", why: "Post-election anxiety; want to know if they're on the right side of community opinion", count: "~40 MPs", action: "Targeted email via @aph.gov.au addresses (already in DB)" },
    { phase: "Phase 3 — Opposition Research", timeline: "Oct–Dec 2026", target: "Liberal/LNP in opposition", why: "Can use constituent data to find policy wedges vs Labor", count: "~60 MPs", action: "Conference presence (LNP National Conference) + ads" },
    { phase: "Phase 4 — Senators", timeline: "Jan 2027+", target: "All senators, esp. crossbench", why: "Senators cover whole states — broader constituent base = more value", count: "76 Senators", action: "Senate committee targeting; Hansard monitoring for relevance" },
  ],
  channels: [
    { channel: "Direct email to @aph.gov.au", priority: "🔴 Highest", notes: "100 MPs already in DB. Personal, hard to ignore. Keep short — they're busy." },
    { channel: "LinkedIn", priority: "🔴 Highest", notes: "MPs are very active on LinkedIn. MP staffers are the decision-makers — target them too." },
    { channel: "Parliamentary press gallery", priority: "🟡 Medium", notes: "A Crikey or The Australian story on Crossbench creates instant credibility." },
    { channel: "Electorate office visits", priority: "🟡 Medium", notes: "In-person demo with a live dashboard showing their own electorate. Very hard to dismiss." },
    { channel: "APH conference / parliamentary week", priority: "🟡 Medium", notes: "Parliament sits in blocks — sponsor a lunch or drinks during sitting weeks." },
    { channel: "Twitter/X", priority: "🟢 Low", notes: "MPs are active but noisy. Better for brand awareness than direct conversion." },
  ],
  stateBreakdown: [
    { state: "NSW", houseSeats: 46, priority: "🔴 Top", notes: "Largest delegation. 6 Independents (Teal seats). High density of marginals." },
    { state: "VIC", houseSeats: 38, priority: "🔴 Top", notes: "27 ALP seats — many marginal. Greens crossbench presence." },
    { state: "QLD", houseSeats: 30, priority: "🟡 High", notes: "LNP stronghold but Labor marginals in SE QLD. One Nation senators = unique pitch." },
    { state: "WA", houseSeats: 15, priority: "🟡 High", notes: "All 10 ALP seats won in landslide — they'll want to know if it holds." },
    { state: "SA", houseSeats: 10, priority: "🟢 Medium", notes: "Balanced but Centre Alliance quirk. Good independent targets." },
    { state: "TAS", houseSeats: 5, priority: "🟢 Medium", notes: "Small but Jacqui Lambie Network = perfect early adopter senator." },
    { state: "ACT/NT", houseSeats: 5, priority: "🟢 Medium", notes: "All ALP. Key Labor test bed." },
  ],
  pricing: [
    { tier: "Pro", price: "$199/mo", pitch: "Individual MP — own electorate dashboard, vote breakdowns, sentiment trends" },
    { tier: "Team", price: "$499/mo", pitch: "Party whip use case — 3 logins, API access, cross-electorate analysis" },
    { tier: "Senate Pro", price: "$299/mo", pitch: "Senator tier — state-wide data, 6 senators per state breakdown" },
  ],
  messaging: [
    "\"Know what your electorate actually thinks — before Question Time.\"",
    "\"Your constituents are already voting on Crossbench. Wouldn't you like to see the data?\"",
    "\"The only real-time constituent sentiment tool built for Australian parliament.\"",
    "\"MPs who use data win marginal seats. MPs who don't... lose them.\"",
    "\"Stop relying on polling firms. Get live data from your own electorate, 24/7.\"",
  ],
};

const VOTER_STRATEGY = {
  overview: "Voters are Crossbench's organic growth engine and the source of the data MPs pay for. Target: 18–65 Australians who care about politics but feel unheard. Motivation: 'My vote counts once every 3 years — now I can be heard every week.'",
  demographics: [
    { segment: "18–30 First-time & young voters", size: "~4.2M Australians", motivation: "Feel politics is broken / out of touch. Greens/Independent leaning.", channels: "TikTok, Instagram Reels, Reddit (r/australia), Discord", message: "\"Your voice, not just your vote.\"", priority: "🔴 Top" },
    { segment: "30–45 Suburban mortgage holders", size: "~5.8M Australians", motivation: "Cost of living, housing. Voted both ways. Highly engaged in election cycles.", channels: "Facebook, Instagram, LinkedIn, podcasts", message: "\"Tell your MP what you actually think about housing policy.\"", priority: "🔴 Top" },
    { segment: "45–60 Established professionals", size: "~4.1M Australians", motivation: "Super, health, immigration. More partisan but open to civic tech.", channels: "LinkedIn, newsletters, Facebook, The Guardian/AFR", message: "\"Constituent intelligence for engaged citizens.\"", priority: "🟡 Medium" },
    { segment: "60+ Retirees / high civic engagement", size: "~3.9M Australians", motivation: "Very high political engagement. Write letters to MPs already.", channels: "Facebook, email, talkback radio", message: "\"More powerful than a letter to your MP.\"", priority: "🟢 Lower" },
  ],
  channels: [
    { channel: "Reddit (r/australia, r/AustralianPolitics)", priority: "🔴 Highest", notes: "Organic posts about specific bills get massive engagement. No paid needed — just post results." },
    { channel: "TikTok / Instagram Reels", priority: "🔴 Highest", notes: "Short explainers: 'How Australia voted on the housing bill'. Young audience. Zero cost if organic." },
    { channel: "Facebook Groups", priority: "🟡 High", notes: "Local electorate groups, community groups. Geo-targeted. Good for suburban demographic." },
    { channel: "Twitter/X", priority: "🟡 High", notes: "Political Twitter is very active in AU. Post real-time voting results during sitting weeks." },
    { channel: "Podcast sponsorship", priority: "🟡 Medium", notes: "The Briefing, 7am, Betoota Advocate. Civically engaged audiences. ~$500-2k/episode." },
    { channel: "Google / Meta paid ads", priority: "🟡 Medium", notes: "Geo-target marginal electorates. CPC relatively cheap for civic keywords." },
    { channel: "News media", priority: "🟡 Medium", notes: "Pitch data stories to The Guardian AU, Crikey, ABC. 'Here's how QLD votes on climate vs the rest of AU'" },
    { channel: "Email newsletter", priority: "🟢 Lower", notes: "Weekly 'What Australia voted on this week'. Build list early. High retention once subscribed." },
  ],
  contentIdeas: [
    "📊 \"How your electorate voted on X\" — shareable stat cards per electorate",
    "🗺️ 'Australia's political heat map' — interactive map of how different electorates vote on key issues",
    "📱 Weekly 'Bills in Parliament' push notifications for engaged users",
    "🎯 'Is your MP listening?' — compare constituent votes vs MP's actual vote in parliament",
    "🔥 'Most controversial bill this week' — highlight bills with big for/against splits",
    "📰 Data stories pitched to media: 'Crossbench data shows 73% of Australians support X policy'",
    "🏆 'Most engaged electorate' leaderboard — gamification for local civic pride",
  ],
  launchPlan: [
    { phase: "Pre-launch (Now)", action: "Build waitlist, post organic Reddit content, set up social accounts" },
    { phase: "Soft launch", action: "Invite-only for first 500 users. Focus on quality data over quantity." },
    { phase: "Public launch", action: "Target during next major parliamentary sitting week for maximum relevance" },
    { phase: "Growth", action: "Refer-a-friend mechanic ('Invite your electorate neighbours'), MP sign-ups drive press coverage" },
  ],
  stateBreakdown: [
    { state: "NSW", population: "8.3M", voters: "~5.1M", focus: "Sydney metro (marginal western suburbs). Large migrant communities — multilingual potential.", priority: "🔴 Top" },
    { state: "VIC", population: "7.0M", voters: "~4.2M", focus: "Melbourne inner city (Greens base). Progressive, tech-savvy. High organic growth potential.", priority: "🔴 Top" },
    { state: "QLD", population: "5.5M", voters: "~3.2M", focus: "SE QLD growth corridor. Politically diverse — great for showing cross-partisan appeal.", priority: "🟡 High" },
    { state: "WA", population: "2.9M", voters: "~1.8M", focus: "Perth metro. Resources-focused electorate. Mining/climate bills will drive engagement.", priority: "🟡 High" },
    { state: "SA", population: "1.9M", voters: "~1.2M", focus: "Adelaide. University towns. Good Greens/Labor mix for civic engagement.", priority: "🟢 Medium" },
    { state: "TAS", population: "570K", voters: "~370K", focus: "Small but highly engaged politically. Jacqui Lambie effect — independent-minded.", priority: "🟢 Medium" },
    { state: "ACT", population: "470K", voters: "~290K", focus: "Public servants, policy wonks — Crossbench's ideal power user demographic.", priority: "🟡 High" },
  ],
};

const badge = (priority: string) => {
  const color = priority.startsWith('🔴') ? '#E53935' : priority.startsWith('🟡') ? '#F59E0B' : '#22C55E';
  return <span style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55`, padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>{priority}</span>;
};

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('mps');

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Marketing Strategy</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">Go-to-market plan for MPs/Senators and voters</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #25324D', paddingBottom: '0' }}>
        {(['mps', 'voters'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #4E8FD4' : '2px solid transparent',
              color: tab === t ? '#4E8FD4' : '#7E8AA3',
              marginBottom: '-1px',
            }}
          >
            {t === 'mps' ? '🏛️ MPs & Senators' : '🗳️ Voters / End Users'}
          </button>
        ))}
      </div>

      {tab === 'mps' && (
        <div className="space-y-8">
          {/* Overview */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', color: '#F5F7FB' }}>🎯 The Pitch</h2>
            <p style={{ color: '#7E8AA3', lineHeight: 1.7, margin: 0 }}>{MP_STRATEGY.overview}</p>
          </div>

          {/* Key messages */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>💬 Key Messages</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MP_STRATEGY.messaging.map((m, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '8px', padding: '12px 16px', color: '#F5F7FB', fontStyle: 'italic', fontSize: '14px' }}>
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>💳 Pricing Tiers</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {MP_STRATEGY.pricing.map((p, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#4E8FD4' }}>{p.price}</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#F5F7FB', marginTop: '4px' }}>{p.tier}</div>
                  <div style={{ fontSize: '13px', color: '#7E8AA3', marginTop: '6px', lineHeight: 1.5 }}>{p.pitch}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rollout phases */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>📅 Rollout Phases</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {MP_STRATEGY.phases.map((p, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#F5F7FB' }}>{p.phase}</div>
                    <div style={{ fontSize: '13px', color: '#4E8FD4', margin: '4px 0' }}>{p.target} · {p.count}</div>
                    <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.5 }}><strong style={{ color: '#A0AABF' }}>Why:</strong> {p.why}</div>
                    <div style={{ fontSize: '13px', color: '#7E8AA3', marginTop: '4px' }}><strong style={{ color: '#A0AABF' }}>How:</strong> {p.action}</div>
                  </div>
                  <span style={{ backgroundColor: '#4E8FD422', color: '#4E8FD4', border: '1px solid #4E8FD455', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.timeline}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>📣 Outreach Channels</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #25324D' }}>
                    {['Channel', 'Priority', 'Notes'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#7E8AA3', fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MP_STRATEGY.channels.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1C2940' }}>
                      <td style={{ padding: '10px 12px', color: '#F5F7FB', fontWeight: 600 }}>{c.channel}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{badge(c.priority)}</td>
                      <td style={{ padding: '10px 12px', color: '#7E8AA3', lineHeight: 1.5 }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* State breakdown */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>🗺️ State Prioritisation</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {MP_STRATEGY.stateBreakdown.map((s, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '15px' }}>{s.state}</span>
                    {badge(s.priority)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4E8FD4', marginBottom: '4px' }}>{s.houseSeats} House seats</div>
                  <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.5 }}>{s.notes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'voters' && (
        <div className="space-y-8">
          {/* Overview */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', color: '#F5F7FB' }}>🎯 Strategy Overview</h2>
            <p style={{ color: '#7E8AA3', lineHeight: 1.7, margin: 0 }}>{VOTER_STRATEGY.overview}</p>
          </div>

          {/* Demographics */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>👥 Audience Segments</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {VOTER_STRATEGY.demographics.map((d, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#F5F7FB' }}>{d.segment}</div>
                    {badge(d.priority)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4E8FD4', marginBottom: '8px' }}>{d.size}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div><span style={{ color: '#A0AABF', fontWeight: 600 }}>Motivation: </span><span style={{ color: '#7E8AA3' }}>{d.motivation}</span></div>
                    <div><span style={{ color: '#A0AABF', fontWeight: 600 }}>Channels: </span><span style={{ color: '#7E8AA3' }}>{d.channels}</span></div>
                  </div>
                  <div style={{ marginTop: '8px', backgroundColor: '#111A2E', borderRadius: '6px', padding: '8px 12px', fontStyle: 'italic', color: '#F5F7FB', fontSize: '13px', borderLeft: '3px solid #4E8FD4' }}>
                    {d.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content ideas */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>💡 Content Ideas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {VOTER_STRATEGY.contentIdeas.map((idea, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '8px', padding: '12px 16px', color: '#F5F7FB', fontSize: '14px', lineHeight: 1.5 }}>
                  {idea}
                </div>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>📣 Marketing Channels</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #25324D' }}>
                    {['Channel', 'Priority', 'Notes'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#7E8AA3', fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {VOTER_STRATEGY.channels.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1C2940' }}>
                      <td style={{ padding: '10px 12px', color: '#F5F7FB', fontWeight: 600 }}>{c.channel}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{badge(c.priority)}</td>
                      <td style={{ padding: '10px 12px', color: '#7E8AA3', lineHeight: 1.5 }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Launch plan */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>🚀 Launch Plan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {VOTER_STRATEGY.launchPlan.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: i < VOTER_STRATEGY.launchPlan.length - 1 ? '16px' : '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#4E8FD4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                    {i < VOTER_STRATEGY.launchPlan.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#25324D', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingTop: '4px', paddingBottom: i < VOTER_STRATEGY.launchPlan.length - 1 ? '0' : '0' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#F5F7FB' }}>{p.phase}</div>
                    <div style={{ fontSize: '13px', color: '#7E8AA3', marginTop: '4px', lineHeight: 1.5 }}>{p.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* State breakdown */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB' }}>🗺️ State Prioritisation</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {VOTER_STRATEGY.stateBreakdown.map((s, i) => (
                <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '15px' }}>{s.state}</span>
                    {badge(s.priority)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4E8FD4', marginBottom: '4px' }}>{s.voters} enrolled voters</div>
                  <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.5 }}>{s.focus}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
