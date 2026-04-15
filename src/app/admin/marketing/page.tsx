'use client';
import { useState } from 'react';

type Tab = 'mps' | 'voters' | 'todo';
type SubTab = 'overview' | 'channels' | 'content' | 'competitive' | 'influencers' | 'kpis' | 'budget' | 'risks';

const badge = (priority: string) => {
  const p = priority.toLowerCase();
  const color = p === 'high' || p.startsWith('🔴') ? '#E53935' : p === 'medium' || p.startsWith('🟡') ? '#F59E0B' : '#22C55E';
  const label = p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Medium' : '🟢 Low';
  return <span style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55`, padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>;
};

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '16px', ...style }}>{children}</div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#F5F7FB', margin: '0 0 14px' }}>{title}</h2>
    {children}
  </div>
);

const MP_DATA = {
  personas: [
    { name: "Emma Chen", age: 42, role: "Chief of Staff, marginal-seat Labor MP, suburban Sydney", motivation: "Wants to show the member is listening; needs quick briefing material before meetings.", painPoint: "Flooded with constituent emails and anecdotes but no clean read on how the seat feels about a bill.", pitch: "Crossbench turns constituent noise into a live bill-by-bill dashboard, so the MP can walk into caucus and media with evidence from their own electorate." },
    { name: "Tom Riley", age: 55, role: "Nationals MP, regional seat", motivation: "Needs to prove he understands local concerns on energy, agriculture, and health.", painPoint: "Hearings give national talking points, but not a simple picture of what locals actually think.", pitch: "See how your electorate breaks on federal bills, then turn that into sharper local advocacy and radio-ready lines." },
    { name: "Ayesha Malik", age: 33, role: "Senator's digital & comms adviser", motivation: "Wants a modern product that saves staff time and creates shareable insights.", painPoint: "Existing tools are generic press-clipping systems or static voting records — not real-time constituent sentiment.", pitch: "A continuous constituency signal and ready-made graphics for newsletters, social, and issue briefings." },
    { name: "David Morgan", age: 49, role: "Independent MP or Senator", motivation: "Needs differentiated, evidence-led representation — a story that he listens better than major parties.", painPoint: "Strong qualitative feedback but no credible, repeatable way to quantify it.", pitch: "Prove the independent model, show responsiveness, and publish a transparent local mandate." },
  ],
  channels: [
    { channel: "Warm outbound email to MPs, chiefs of staff & electorate offices", priority: "high", tactic: "3-step sequence: 1) localised screenshot with the member's electorate, 2) 2-line value prop, 3) 10-min walkthrough offer + free trial. Reference one live bill relevant to the seat.", cost: "Low", expectedROI: "Highest near-term conversion — product is immediately legible to political staffers" },
    { channel: "LinkedIn founder-led posting", priority: "high", tactic: "Post seat-specific dashboards, screenshots, and short takes on sitting-week bills. Tag MPs only when the content is genuinely useful, not promotional.", cost: "Low", expectedROI: "High for credibility and inbound from staffers, researchers, and political operators" },
    { channel: "Warm intros through policy & comms networks", priority: "high", tactic: "Leverage former staff, lobbyists, advisers, and journalists for warm intros to offices.", cost: "Low", expectedROI: "Very high — trust is the purchase barrier" },
    { channel: "Parliament-adjacent events in Canberra", priority: "medium", tactic: "Attend Australia Institute / Grattan / CIS panels, ACTU-style policy events, committee briefings, and Canberra networking drinks.", cost: "Medium", expectedROI: "Moderate but strong for legitimacy and deal acceleration" },
    { channel: "PR and trade media", priority: "medium", tactic: "Pitch as a new transparency layer for democracy, especially when a bill is controversial or narrowly decided.", cost: "Low–Medium", expectedROI: "Good for awareness, slower for conversions" },
    { channel: "Targeted paid LinkedIn ads", priority: "low", tactic: "Only retarget visitors and run office-holder audience tests around Canberra, inner-Melbourne, Sydney, and Perth.", cost: "Medium", expectedROI: "Lower than outbound, useful for retargeting and credibility reinforcement" },
  ],
  contentCalendar: [
    { trigger: "48h before each sitting week", content: "'What your electorate is likely to care about this sitting week' — 3 bills, 1 local angle, dashboard screenshots.", channel: "LinkedIn, email" },
    { trigger: "Day 1 of sitting week", content: "Short video from founder: 3 bills to watch, who is under pressure, what staff should track.", channel: "LinkedIn, X, email" },
    { trigger: "Any notable division or vote", content: "Seat-specific result graphic sent privately to target offices, then a public summary next morning.", channel: "Email, LinkedIn" },
    { trigger: "Question Time / major media cycle", content: "'What constituents actually think' thread — one chart, one sentence of interpretation.", channel: "LinkedIn, X" },
    { trigger: "Committee inquiry relevant to a target seat", content: "One-page issue briefing showing seat-level sentiment and likely local pressure points.", channel: "Email PDF" },
    { trigger: "End of sitting fortnight", content: "'Your electorate's top 5 bill positions this fortnight' digest with CTA to upgrade to Pro/Team.", channel: "Email" },
    { trigger: "Budget week / MYEFO", content: "Special report on the seats most affected by measures, plus a media-ready chart.", channel: "LinkedIn, email, press" },
  ],
  messages: {
    "LinkedIn": ["Your electorate has a live opinion on this bill. Crossbench turns that into a dashboard your office can actually use.", "If you are still relying on random emails and call notes to judge constituent sentiment, you are missing the pattern.", "New on Crossbench: electorate-level views on current federal bills, updated as Australians vote."],
    "Email subject lines": ["See how your electorate is splitting on [Bill Name]", "A better way to brief your member before sitting week", "Free trial for [electorate name] dashboard"],
    "In person": ["We help you answer one simple question staff never get a clean answer to — what do my constituents think about this bill right now?", "Think of it as a live constituency pulse, not another generic analytics tool.", "If your office wants a tailored electorate demo, we can build it in minutes."],
  },
  competitive: [
    { name: "They Vote For You", what: "Public record of how MPs vote on divisions — transparency and accountability frame.", weakness: "Explains what MPs did, not what constituents think. Retrospective, not live or seat-specific.", positioning: "Crossbench is the constituent-sentiment layer above the vote record, built for staffers who need action, not just history." },
    { name: "GetUp", what: "Mass advocacy and petition platform with strong campaign mobilisation.", weakness: "Designed to mobilise around issues, not provide per-electorate bipartisan sentiment intelligence to MPs.", positioning: "Crossbench is neutral infrastructure, useful to any office regardless of party." },
    { name: "Change.org", what: "Petition and public campaign platform.", weakness: "Broad issue petitions are noisy, unverified, and not electorate-representative.", positioning: "Crossbench is verified electorate signal, not petition noise." },
    { name: "AustralianPolitics.com", what: "Political reference and election information site.", weakness: "Broad reference utility, not a real-time engagement tool for offices.", positioning: "Crossbench is a working dashboard, not a political encyclopedia." },
    { name: "Parliament of Australia / Hansard", what: "Official parliamentary source material.", weakness: "Official but hard to interpret; not transformed into voter-facing or staff-ready insight.", positioning: "Crossbench translates official parliamentary activity into usable local insight." },
  ],
  influencers: [
    { name: "Patricia Karvelas", platform: "ABC Radio National / The Party Room", why: "Major political interviewer with strong Canberra credibility halo.", approach: "Pitch as a new data source for how Australians react to bills, especially on close or high-salience votes." },
    { name: "David Speers", platform: "ABC Insiders / 7.30", why: "Sets the frame for federal political debate, likes clear political data stories.", approach: "Offer a short, visual, non-partisan briefing on one controversial bill and electorate splits." },
    { name: "Tom McIlroy", platform: "Australian Financial Review", why: "Reads Canberra policy and staffer audiences well.", approach: "Send a concise data-led tip whenever a bill has a constituency angle or internal party tension." },
    { name: "Paul Karp", platform: "The Guardian Australia", why: "Strong on parliamentary detail, process, and accountability.", approach: "Frame Crossbench as a transparency tool revealing the gap between chamber votes and electorate sentiment." },
    { name: "Democracy Sausage podcast", platform: "Podcast", why: "Civic/political audience that already likes election and parliament nerdery.", approach: "Pitch as a new way to measure local democratic sentiment between elections." },
    { name: "The Party Room", platform: "Podcast / ABC", why: "Reach politically engaged listeners and staffers.", approach: "Short sponsor-read or guest segment focused on a live bill heatmap." },
    { name: "The Squiz Today", platform: "Newsletter / podcast", why: "Mass reach to busy professionals who like digestible politics.", approach: "Offer a simple explainer graphic and one-line insight for their politics newsletter." },
  ],
  kpis: {
    "3 months": ["20–30 office contacts in CRM, at least 8 warm intros", "5–10 product demos delivered", "2–3 paid pilots or trials started", "1 clear testimonial from a staffer or adviser", "Email open rates above 40% on personalised office outreach"],
    "6 months": ["10–15 paying offices (mix of Pro and Team)", "1–2 Canberra media or podcast mentions", "50–100 verified voter signups/week from organic channels", "3+ repeat offices using the product across multiple sitting weeks", "Outreach → demo conversion rate above 20%"],
    "12 months": ["30–50 paying offices with low churn", "Meaningful presence in Canberra political discourse", "Repeatable pipeline with monthly inbound from staffers and MPs", "5,000+ verified voters across multiple electorates", "Seat-level dashboard content consistently reused by offices"],
  },
  budget: [
    { category: "Founder-led sales & outreach", monthlyAud: 1200, rationale: "List building, personalisation, demos, follow-up, CRM. Highest leverage activity." },
    { category: "Canberra travel & events", monthlyAud: 800, rationale: "Needed for trust, proximity, and serendipitous staffer meetings." },
    { category: "LinkedIn & retargeting ads", monthlyAud: 900, rationale: "Retarget site visitors, reinforce awareness, test office-holder audiences." },
    { category: "PR / freelance pitching", monthlyAud: 700, rationale: "Media lift around sitting weeks, budgets, or headline bills." },
    { category: "Design (charts, screenshots, one-pagers)", monthlyAud: 700, rationale: "Political buyers are visual — good data graphics improve trust and shareability." },
    { category: "Data enrichment & contact tooling", monthlyAud: 400, rationale: "CRM, lists, and small software tools to manage targeted outreach." },
    { category: "Content production", monthlyAud: 300, rationale: "Short video edits, thumbnails, issue-specific landing pages." },
  ],
  risks: [
    { risk: "Perception of partisanship", likelihood: "high", mitigation: "Keep language neutral, show all electorates, avoid advocacy framing in B2B pitch." },
    { risk: "MP offices ignore cold outreach", likelihood: "high", mitigation: "Use warm intros, localised examples, one clear ask." },
    { risk: "Product ambiguity between civic platform and B2B dashboard", likelihood: "medium", mitigation: "Separate voter acquisition from office sales on site, messaging, and landing pages." },
    { risk: "Media interest peaks but office conversions lag", likelihood: "medium", mitigation: "Capture every media spike with office-targeted follow-up and demos." },
    { risk: "Privacy or representativeness concerns", likelihood: "medium", mitigation: "Be explicit about verification, aggregation, and how electorate boundaries are used." },
    { risk: "Too much content, too little proof", likelihood: "medium", mitigation: "Lead with one excellent seat-level demo, not broad generic campaigns." },
  ],
};

const VOTER_DATA = {
  personas: [
    { name: "Sarah Nguyen", age: 28, role: "Inner-city renter, Melbourne", motivation: "Wants to feel politically effective without joining a party. Likes seeing how her seat compares to the country.", painPoint: "Politics feels noisy, tribal, and disconnected from her real life.", pitch: "Vote on the bills that shape your life, then see how your electorate stacks up against Australia." },
    { name: "Ben Carter", age: 36, role: "Tradesperson, regional Queensland", motivation: "Cares about cost of living, energy, fuel, and jobs. Wants practical politics, not culture-war theatre.", painPoint: "Most political content feels like inner-city argument theatre.", pitch: "Get a straight read on what federal bills mean for your area, then see how people around you vote." },
    { name: "Mia Thompson", age: 19, role: "First-time voter, uni student, Adelaide", motivation: "Wants low-friction ways to learn politics and take part without being lectured.", painPoint: "Politics is overwhelming and full of jargon.", pitch: "Swipe through real bills, vote in minutes, and see what your community thinks." },
    { name: "Leila Haddad", age: 41, role: "Busy parent & public sector worker, western Sydney", motivation: "Wants to stay informed but only has short windows of attention.", painPoint: "Can't keep up with every bill, but still wants to contribute meaningfully.", pitch: "Quick bill summaries and a vote in under a minute." },
    { name: "Gavin O'Connor", age: 63, role: "Retiree, community volunteer & news junkie, Perth", motivation: "Loves politics and wants a better sense of how his electorate is shifting on major issues.", painPoint: "National polls flatten local nuance.", pitch: "See how your electorate votes bill by bill, then compare it with the rest of the country." },
  ],
  channels: [
    { channel: "TikTok & Instagram Reels", priority: "high", tactic: "Short bill explainers — one chart per video, one local hook, one CTA to vote. Use native captions and low-production founder voiceovers.", cost: "Low–Medium", expectedROI: "High for awareness and top-of-funnel signups, especially under 35" },
    { channel: "Reddit & community forums", priority: "high", tactic: "Post useful explainers in r/australia, r/AustralianPolitics, city/local subreddits — only when genuinely informative, never spammy.", cost: "Low", expectedROI: "Strong for credibility and organic traffic" },
    { channel: "Email newsletter", priority: "high", tactic: "Weekly 'Bills that matter this week' digest — 3 summaries, one local stat, one big question.", cost: "Low", expectedROI: "Very high for retention and repeat participation" },
    { channel: "PR & earned media", priority: "high", tactic: "Pitch stories around surprising electorate splits, youth engagement, or local issue heat maps.", cost: "Low", expectedROI: "High when tied to a current bill or election news cycle" },
    { channel: "Partner newsletters & podcasts", priority: "medium", tactic: "Guest posts, swaps, and short explainers with civic and politics creators.", cost: "Low–Medium", expectedROI: "Good for trust and steady signups" },
    { channel: "Paid social", priority: "medium", tactic: "Boost best-performing explainers; geo-targeted ads in key electorates and capital cities.", cost: "Medium", expectedROI: "Moderate, useful when paired with strong landing pages" },
  ],
  contentCalendar: [
    { trigger: "Day a major bill is introduced or debated", content: "One short explainer: what the bill does, why it matters, and how to vote on Crossbench.", channel: "TikTok, Instagram, X, email" },
    { trigger: "Every sitting week Monday", content: "'This week in Parliament' carousel — 3 bills and one local issue per major state.", channel: "Instagram, LinkedIn, email" },
    { trigger: "Mid-week", content: "Electorate comparison post: 'How your area voted vs Australia'.", channel: "Instagram, TikTok, X" },
    { trigger: "Friday", content: "'What changed this week' summary with CTA to vote before the weekend.", channel: "Email, socials" },
    { trigger: "Budget week / housing week / tax week", content: "Issue explainer series with simple graphics and one local human story.", channel: "TikTok, Reels, email" },
    { trigger: "Outside sitting weeks", content: "Evergreen education posts: how federal bills become law, why votes matter, how electorates differ.", channel: "TikTok, blog, email" },
  ],
  messages: {
    "TikTok / Reels": ["One bill. One minute. See how Australia voted.", "Your MP voted yes. Your electorate said no. Here's the gap.", "Politics, but make it local."],
    "Reddit": ["We built a tool to vote on real federal bills and see how your electorate compares. Here's how [specific bill] is landing across Australia.", "Data from Crossbench: here's how different electorates are splitting on this week's housing bill."],
    "Email": ["Subject: Your electorate's view on this bill", "Subject: This week in Parliament, in plain English", "Subject: See what your electorate thinks (new bill results live)"],
    "Press": ["Crossbench lets Australians vote on real federal bills and see how their electorate lines up with the national result.", "It is a public-interest civic platform designed to make Parliament more understandable and more local.", "We are not another petition site — we are a living electorate sentiment layer."],
  },
  competitive: [
    { name: "GetUp", what: "Issue-driven mobilisation, petitions, and campaign campaigning.", weakness: "Activist framing, less neutral, not a bill-by-bill civic participation product.", positioning: "Crossbench is for participation and insight, not campaign mobilisation." },
    { name: "Change.org", what: "Generic petition platform.", weakness: "Low deliberation quality and weak electorate context.", positioning: "Crossbench gives structured voting on real bills with electorate comparison." },
    { name: "They Vote For You", what: "MP voting record tracker.", weakness: "Useful but passive — focused on representatives not citizens.", positioning: "Crossbench is interactive, current, and local." },
    { name: "AustralianPolitics.com", what: "Political reference site and election data resource.", weakness: "Information-first, not participation-first.", positioning: "Crossbench turns political information into action." },
    { name: "ABC News / parliament coverage", what: "Trusted explanatory journalism.", weakness: "Does not provide the user's own vote or local comparison.", positioning: "Crossbench complements journalism by giving the reader a place to participate." },
  ],
  influencers: [
    { name: "The Squiz", platform: "Newsletter / podcast", why: "Mass-market explainers for time-poor Australians.", approach: "Offer easy-to-use bill explainers and one strong chart." },
    { name: "7am podcast", platform: "Podcast / newsletter", why: "Engaged audience that likes clean explanatory politics.", approach: "Pitch a story about how one bill is landing in different electorates." },
    { name: "Democracy Sausage", platform: "Podcast", why: "Direct fit for civic-tech and politics nerd audiences.", approach: "Guest segment or sponsor-style mention about voting on bills between elections." },
    { name: "The Australia Institute", platform: "Org / media / podcasts", why: "Large public-facing policy audience, strong issue focus.", approach: "Collaborate on a public explainer or co-branded data story when a bill matches their research." },
    { name: "Betoota Advocate", platform: "Satire / social", why: "Massive reach with 18–40s; if they run a 'data story' angle it goes viral.", approach: "Pitch genuinely funny electorate splits or surprising result graphics." },
    { name: "Australian political TikTok creators", platform: "TikTok", why: "Short-form political explainer creators drive signups fast.", approach: "Seed one simple explainer per creator with a local angle and a clear CTA." },
  ],
  kpis: {
    "3 months": ["1,000–2,500 verified voter signups", "25–40% email open rate", "10–20% of signups voting on at least one bill", "5–10 pieces of earned or partner media", "Average share rate above 5% on best-performing explainer posts"],
    "6 months": ["5,000–10,000 verified voters", "2,000+ recurring monthly active users", "50–100 electorate-specific shares per major bill", "Signup conversion from social above 3%", "Clear retention cohort showing repeat voting across multiple bills"],
    "12 months": ["20,000+ verified voters", "Broad coverage across most seats with meaningful repeat participation", "Crossbench known as a credible civic utility in Australian political media", "Strong organic search presence for bill and electorate queries", "Politically engaged 18–34s as a defined core user base"],
  },
  budget: [
    { category: "Short-form video production", monthlyAud: 1400, rationale: "TikTok/Reels explainers, templates, captions, and editing." },
    { category: "Paid social boosts", monthlyAud: 1300, rationale: "Amplify winning content; test electorates, demographics, and issue angles." },
    { category: "Design & data visualisation", monthlyAud: 700, rationale: "A civic product lives or dies on clarity and visual trust." },
    { category: "Partnerships & creator seeding", monthlyAud: 700, rationale: "Small payments or honorariums for trusted civic voices." },
    { category: "PR support", monthlyAud: 400, rationale: "Pitch angles, media lists, and timing around major bills." },
    { category: "Newsletter & email tooling", monthlyAud: 300, rationale: "Retention and lifecycle messaging are central for repeat participation." },
    { category: "Landing pages & SEO content", monthlyAud: 200, rationale: "Evergreen explainers that bring in search traffic around bills, MPs, and electorates." },
  ],
  risks: [
    { risk: "People think it is a partisan campaign tool", likelihood: "high", mitigation: "Neutral UX, neutral language, and a strong public-interest frame." },
    { risk: "Low repeat usage after novelty spike", likelihood: "high", mitigation: "Tie content to the sitting calendar, newsletters, and alerts." },
    { risk: "Competing with louder advocacy brands for attention", likelihood: "high", mitigation: "Own the niche of bill-level participation plus electorate comparison." },
    { risk: "Low trust in electorate verification", likelihood: "medium", mitigation: "Explain verification clearly and minimise friction while protecting integrity." },
    { risk: "Complex bills are hard to explain simply", likelihood: "medium", mitigation: "Use one-sentence summaries, plain English labels, and local examples." },
  ],
};

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: '👥 Personas' },
  { id: 'channels', label: '📣 Channels' },
  { id: 'content', label: '📅 Content Calendar' },
  { id: 'competitive', label: '⚔️ Competitive' },
  { id: 'influencers', label: '🤝 Partners & Media' },
  { id: 'kpis', label: '📊 KPIs' },
  { id: 'budget', label: '💰 Budget' },
  { id: 'risks', label: '⚠️ Risks' },
];

const TODO_ITEMS = [
  { id: 1, category: 'LinkedIn', priority: 'high', task: 'Create Crossbench LinkedIn company page', notes: 'Company name: Crossbench · Industry: Technology · Tagline: "Real-time constituent sentiment for Australian MPs" · Admin: Jeffa · Parent: EquiM8 Group ABN' },
  { id: 2, category: 'LinkedIn', priority: 'high', task: 'Write company description for LinkedIn page', notes: '2-3 paragraph about section covering the product, mission, and MP value prop. Also draft first announcement post.' },
  { id: 3, category: 'LinkedIn', priority: 'medium', task: 'Generate LinkedIn banner image (1128×191px)', notes: 'Dark background matching brand, logo on left, tagline on right. Can use AI image generation.' },
  { id: 4, category: 'LinkedIn', priority: 'medium', task: 'Post launch announcement on LinkedIn', notes: 'Short founder post: what Crossbench is, why it exists, link to crossbench.io' },
  { id: 5, category: 'Email', priority: 'high', task: 'Set up Cloudflare Email Routing once DNS migrated', notes: 'Routes: privacy@ · abuse@ · info@ → forward to personal email. Free, 2 min setup.' },
  { id: 6, category: 'Email', priority: 'medium', task: 'Verify crossbench.io domain in Resend', notes: 'Currently sending from noreply@crossbench.io — need domain verified for reliable delivery' },
  { id: 7, category: 'Support', priority: 'high', task: 'Build internal support ticket system', notes: 'Users submit tickets → appear in /admin/support · Telegram notification to Jeffa · AI assistant can help users in-thread' },
  { id: 8, category: 'Product', priority: 'medium', task: 'Search/filter on bills page', notes: 'Filter by status, portfolio, chamber, keyword search' },
  { id: 9, category: 'Product', priority: 'medium', task: 'Share-your-vote social card', notes: 'After voting on a bill, user can share a card showing their position + how their electorate voted' },
  { id: 10, category: 'Product', priority: 'medium', task: 'Approval rating widget on MP dashboard', notes: 'Show % positive from own electorate vs nationally using MpSentiment data' },
];

const CATEGORIES = ['All', 'LinkedIn', 'Email', 'Support', 'Product'];

function TodoSection() {
  const [catFilter, setCatFilter] = useState('All');
  const filtered = catFilter === 'All' ? TODO_ITEMS : TODO_ITEMS.filter(t => t.category === catFilter);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Tasks & To-Do</h1>
      <p className="text-[#7E8AA3] text-sm mb-4">Outstanding work across marketing, product, and ops.</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: catFilter === c ? '#4E8FD4' : '#25324D', backgroundColor: catFilter === c ? '#4E8FD422' : '#111A2E', color: catFilter === c ? '#4E8FD4' : '#7E8AA3' }}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(t => (
          <div key={t.id} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'start' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: t.category === 'LinkedIn' ? '#0A66C222' : t.category === 'Support' ? '#2E8B5722' : t.category === 'Email' ? '#D6A94A22' : '#7E8AA322', color: t.category === 'LinkedIn' ? '#0A66C2' : t.category === 'Support' ? '#2E8B57' : t.category === 'Email' ? '#D6A94A' : '#7E8AA3', border: '1px solid', borderColor: t.category === 'LinkedIn' ? '#0A66C255' : t.category === 'Support' ? '#2E8B5755' : t.category === 'Email' ? '#D6A94A55' : '#7E8AA355', whiteSpace: 'nowrap' }}>{t.category}</span>
            <div>
              <div style={{ fontWeight: 600, color: '#F5F7FB', fontSize: '14px', marginBottom: '4px' }}>{t.task}</div>
              <div style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.5 }}>{t.notes}</div>
            </div>
            {badge(t.priority)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('mps');
  const [sub, setSub] = useState<SubTab>('overview');
  const data = tab === 'mps' ? MP_DATA : VOTER_DATA;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold">Marketing Strategy</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">Go-to-market plan · Updated 13 Apr 2026</p>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #25324D' }}>
        {([['mps', '🏛️ MPs & Senators'], ['voters', '🗳️ Voters / End Users'], ['todo', '✅ Tasks & To-Do']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setSub('overview'); }} style={{ padding: '10px 20px', fontWeight: 700, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === t ? '2px solid #4E8FD4' : '2px solid transparent', color: tab === t ? '#4E8FD4' : '#7E8AA3', marginBottom: '-1px' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'todo' && <TodoSection />}

      {/* Sub tabs */}
      <div style={{ display: tab === 'todo' ? 'none' : 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)} style={{ padding: '6px 14px', fontWeight: 600, fontSize: '13px', background: sub === s.id ? '#4E8FD422' : '#111A2E', border: sub === s.id ? '1px solid #4E8FD4' : '1px solid #25324D', borderRadius: '999px', cursor: 'pointer', color: sub === s.id ? '#4E8FD4' : '#7E8AA3' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Strategy content — hidden when on todo tab */}
      {tab !== 'todo' && sub === 'overview' && (
        <Section title="Audience Personas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {data.personas.map((p, i) => (
              <Card key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1C2940', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {p.name.split(' ')[0][0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '14px' }}>{p.name}, {p.age}</div>
                    <div style={{ fontSize: '12px', color: '#4E8FD4' }}>{p.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '6px' }}><span style={{ color: '#A0AABF', fontWeight: 600 }}>Motivation: </span><span style={{ color: '#7E8AA3' }}>{p.motivation}</span></div>
                <div style={{ fontSize: '13px', marginBottom: '8px' }}><span style={{ color: '#A0AABF', fontWeight: 600 }}>Pain: </span><span style={{ color: '#7E8AA3' }}>{p.painPoint}</span></div>
                <div style={{ backgroundColor: '#111A2E', borderLeft: '3px solid #4E8FD4', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '13px', color: '#F5F7FB', fontStyle: 'italic' }}>"{p.pitch}"</div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Channels */}
      {sub === 'channels' && (
        <Section title="Channel Strategy (ranked by ROI)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.channels.map((c, i) => (
              <Card key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '14px', marginBottom: '6px' }}>{c.channel}</div>
                  <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.6, marginBottom: '6px' }}>{c.tactic}</div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span><span style={{ color: '#A0AABF' }}>Cost: </span><span style={{ color: '#7E8AA3' }}>{c.cost}</span></span>
                    <span><span style={{ color: '#A0AABF' }}>ROI: </span><span style={{ color: '#7E8AA3' }}>{c.expectedROI}</span></span>
                  </div>
                </div>
                {badge(c.priority)}
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Content Calendar */}
      {sub === 'content' && (
        <div className="space-y-6">
          <Section title="Content Calendar — Tied to Parliamentary Sitting Schedule">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.contentCalendar.map((c, i) => (
                <Card key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', alignItems: 'start' }}>
                  <div style={{ backgroundColor: '#4E8FD422', border: '1px solid #4E8FD455', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#4E8FD4', whiteSpace: 'nowrap', textAlign: 'center' }}>TRIGGER</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '13px', marginBottom: '4px' }}>{c.trigger}</div>
                    <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.5, marginBottom: '4px' }}>{c.content}</div>
                    <div style={{ fontSize: '12px', color: '#4E5A73' }}>📤 {c.channel}</div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
          <Section title="Platform-Specific Messaging">
            {Object.entries(data.messages).map(([platform, msgs]) => (
              <div key={platform} style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: '#A0AABF', fontSize: '13px', marginBottom: '8px' }}>{platform}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(msgs as string[]).map((m, i) => (
                    <div key={i} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#F5F7FB', fontStyle: 'italic' }}>"{m}"</div>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        </div>
      )}

      {/* Competitive */}
      {sub === 'competitive' && (
        <Section title="Competitive Landscape">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.competitive.map((c, i) => (
              <Card key={i}>
                <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '15px', marginBottom: '8px' }}>{c.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div><div style={{ color: '#A0AABF', fontWeight: 600, marginBottom: '4px' }}>What they do</div><div style={{ color: '#7E8AA3', lineHeight: 1.5 }}>{c.what}</div></div>
                  <div><div style={{ color: '#E53935', fontWeight: 600, marginBottom: '4px' }}>Their weakness</div><div style={{ color: '#7E8AA3', lineHeight: 1.5 }}>{c.weakness}</div></div>
                  <div><div style={{ color: '#22C55E', fontWeight: 600, marginBottom: '4px' }}>Our positioning</div><div style={{ color: '#7E8AA3', lineHeight: 1.5 }}>{c.positioning}</div></div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Influencers */}
      {sub === 'influencers' && (
        <Section title="Media, Partners & Influencer Targets">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {data.influencers.map((inf, i) => (
              <Card key={i}>
                <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '14px' }}>{inf.name}</div>
                <div style={{ fontSize: '12px', color: '#4E8FD4', margin: '4px 0 8px' }}>{inf.platform}</div>
                <div style={{ fontSize: '13px', color: '#7E8AA3', marginBottom: '6px', lineHeight: 1.5 }}><span style={{ color: '#A0AABF', fontWeight: 600 }}>Why: </span>{inf.why}</div>
                <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.5 }}><span style={{ color: '#A0AABF', fontWeight: 600 }}>Approach: </span>{inf.approach}</div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* KPIs */}
      {sub === 'kpis' && (
        <Section title="KPIs & Success Metrics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(data.kpis).map(([period, items]) => (
              <Card key={period}>
                <div style={{ fontWeight: 700, color: '#4E8FD4', fontSize: '14px', marginBottom: '10px' }}>{period}</div>
                <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                  {(items as string[]).map((item, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.7 }}>{item}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Budget */}
      {sub === 'budget' && (
        <Section title={`Budget Breakdown — ~$${data.budget.reduce((s, b) => s + b.monthlyAud, 0).toLocaleString()}/month`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.budget.sort((a, b) => b.monthlyAud - a.monthlyAud).map((b, i) => {
              const total = data.budget.reduce((s, x) => s + x.monthlyAud, 0);
              const pct = Math.round((b.monthlyAud / total) * 100);
              return (
                <Card key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '13px', marginBottom: '4px' }}>{b.category}</div>
                    <div style={{ fontSize: '12px', color: '#7E8AA3' }}>{b.rationale}</div>
                    <div style={{ marginTop: '8px', height: '4px', backgroundColor: '#1C2940', borderRadius: '2px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#4E8FD4', borderRadius: '2px' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#4E8FD4' }}>${b.monthlyAud.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#4E5A73' }}>{pct}%</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {/* Risks */}
      {sub === 'risks' && (
        <Section title="Risk Register">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.risks.map((r, i) => (
              <Card key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '14px', marginBottom: '6px' }}>{r.risk}</div>
                  <div style={{ fontSize: '13px', color: '#7E8AA3', lineHeight: 1.5 }}><span style={{ color: '#22C55E', fontWeight: 600 }}>Mitigation: </span>{r.mitigation}</div>
                </div>
                {badge(r.likelihood)}
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
