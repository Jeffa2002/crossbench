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
    { name: "Parliamentary adviser", age: 42, role: "Federal electorate or Senate office", motivation: "Needs reliable, neutral source material before a sitting week.", painPoint: "Official bills can be difficult to explain quickly without oversimplifying them.", pitch: "Crossbench is an early-stage public tool for following bills and recording a simple participant vote — not an electorate survey." },
    { name: "Civic-sector researcher", age: 38, role: "Democracy, integrity or public-policy organisation", motivation: "Wants to test whether the product's safeguards and claims are clear.", painPoint: "Civic technology often overstates participation data or obscures its limits.", pitch: "Scrutinise the methodology, language and user experience before Crossbench reaches a broader audience." },
    { name: "Political journalist", age: 35, role: "Parliamentary or public-interest reporter", motivation: "Looks for useful, factual ways to make legislation understandable.", painPoint: "New apps are rarely a story without a tangible public-interest angle.", pitch: "A founder-led, very early pilot: plain-English bill information and explicitly self-selected votes, with no polling claim." },
  ],
  channels: [
    { channel: "Founder-led, one-to-one outreach", priority: "high", tactic: "Use the reviewed routes in /admin/media one at a time. Introduce the early pilot, state the self-selection limit, and ask for feedback rather than coverage or endorsement.", cost: "Low", expectedROI: "Best route to useful qualitative feedback and early trust" },
    { channel: "User interviews and usability sessions", priority: "high", tactic: "Recruit 10–15 people through personal and relevant civic networks. Watch them find a bill, understand it and record a vote; log where wording fails.", cost: "Low", expectedROI: "Direct evidence for product and message changes" },
    { channel: "Methodology and trust page", priority: "high", tactic: "Publish what a vote means, that users cannot comment, how results are aggregated, and why they are not representative polling.", cost: "Low", expectedROI: "Essential precondition for credible outreach" },
    { channel: "Neutral bill explainers", priority: "medium", tactic: "Publish only when there is a clear official source. Explain the bill, link the source, invite a vote and avoid predicting public opinion.", cost: "Low", expectedROI: "Builds a useful public record before paid promotion" },
    { channel: "Earned media and civic partners", priority: "medium", tactic: "Offer a brief founder conversation or product walkthrough after the methodology and a real bill example are ready. Keep every claim independently checkable.", cost: "Low", expectedROI: "Useful validation, not a launch target" },
    { channel: "Paid social", priority: "low", tactic: "Defer spending until interviews show comprehension, the landing page converts, and a small organic test establishes a useful message.", cost: "Deferred", expectedROI: "No spend until there is evidence it will help" },
  ],
  contentCalendar: [
    { trigger: "Before a sitting week", content: "Choose one current bill and publish a plain-English explainer with an official source link and a clear invitation to vote.", channel: "Website, LinkedIn, email" },
    { trigger: "During a bill's progress", content: "Update the explainer with confirmed parliamentary changes. State what is known, what is unresolved and what Crossbench does not measure.", channel: "Website, LinkedIn" },
    { trigger: "After a small user-feedback session", content: "Publish a short change note: what users found confusing and what was changed. Do not publish personal feedback or imply a public mandate.", channel: "Website, email" },
    { trigger: "When participation is displayed", content: "Label it as aggregated, self-selected platform participation and show the count and date. Never call it electorate sentiment or polling.", channel: "Website, social" },
    { trigger: "Monthly", content: "Refresh the methodology, accessibility and privacy notes; invite correction from journalists, civic groups and users.", channel: "Website, founder outreach" },
  ],
  messages: {
    "LinkedIn": ["Crossbench is an early-stage way to follow federal bills in plain English and record a simple vote.", "Participant votes are self-selected, not representative polling. That limit is part of the product story, not fine print.", "We are looking for feedback on whether the experience makes a current bill easier to understand."],
    "Email subject lines": ["A quick look at an early Crossbench pilot?", "Feedback on a new way to follow federal bills", "Could you pressure-test this civic-tech idea?"],
    "In person": ["We are testing whether people can better understand a live federal bill with a short, neutral explanation.", "Users can support, oppose or abstain. They cannot comment, and the results are not polling.", "We are looking for criticism and practical feedback before any broader marketing."],
  },
  competitive: [
    { name: "They Vote For You", what: "Public record of how MPs vote on divisions — transparency and accountability frame.", weakness: "Focused on representatives' recorded votes rather than a user action alongside bill explainers.", positioning: "Crossbench should complement this work with clear current-bill explanations and participant voting, never with polling claims." },
    { name: "GetUp", what: "Mass advocacy and petition platform with strong campaign mobilisation.", weakness: "Designed to mobilise around issues, not provide per-electorate bipartisan sentiment intelligence to MPs.", positioning: "Crossbench is neutral infrastructure, useful to any office regardless of party." },
    { name: "Change.org", what: "Petition and public campaign platform.", weakness: "Issue petitions are a different interaction from reading a bill and recording a structured position.", positioning: "Crossbench is a neutral bill-following and participation product, not a campaign or a claim about electorate opinion." },
    { name: "AustralianPolitics.com", what: "Political reference and election information site.", weakness: "Broad reference utility, not a real-time engagement tool for offices.", positioning: "Crossbench is a working dashboard, not a political encyclopedia." },
    { name: "Parliament of Australia / Hansard", what: "Official parliamentary source material.", weakness: "Authoritative material can be difficult for a casual reader to navigate quickly.", positioning: "Crossbench should link back to official sources and make the legislative journey easier to follow, without replacing them." },
  ],
  influencers: [
    { name: "Political journalists and editors", platform: "Media", why: "Can pressure-test the public-interest angle and explain what is genuinely newsworthy.", approach: "Use /admin/media for individually reviewed, source-linked routes; ask for feedback first and do not pitch self-selected votes as polling." },
    { name: "Transparency International Australia", platform: "Civic integrity organisation", why: "Relevant perspective on transparency, trust and public-interest claims.", approach: "Ask for methodology feedback only; do not imply endorsement or a partnership." },
    { name: "Australian Democracy Network", platform: "Civic democracy organisation", why: "Relevant perspective on participation and democratic safeguards.", approach: "Ask for early critique of language, safeguards and accessibility; do not seek an endorsement." },
    { name: "Democracy Sausage podcast", platform: "Podcast", why: "Civic and political audience that values evidence and parliamentary context.", approach: "Approach only after a tested bill explainer and methodology page are ready; offer a candid early-stage conversation." },
    { name: "The Party Room", platform: "Podcast / ABC", why: "Reach politically engaged listeners and staffers.", approach: "Short sponsor-read or guest segment focused on a live bill heatmap." },
    { name: "The Squiz Today", platform: "Newsletter / podcast", why: "Mass reach to busy professionals who like digestible politics.", approach: "Offer a simple explainer graphic and one-line insight for their politics newsletter." },
  ],
  kpis: {
    "First 8 weeks": ["10–15 observed user interviews or usability sessions", "One methodology/trust page reviewed by at least three external readers", "10 individually reviewed feedback or media approaches, with no bulk sending", "A measured time-to-understand and time-to-vote baseline", "A written list of product and wording changes from feedback"],
    "3 months": ["25+ people invited to give feedback, with source and outcome recorded", "At least one current-bill explainer validated against its official source", "A small organic acquisition test with clear conversion and comprehension data", "No public claim that platform participation represents an electorate or Australia"],
    "6 months": ["Evidence of repeat use across several bills", "A stable, publicly explainable methodology", "Earned attention only where a factual bill story exists", "A decision, based on data, on whether paid promotion is justified"],
  },
  budget: [
    { category: "User research and accessibility", monthlyAud: 300, rationale: "Participant thank-yous, transcription and practical usability testing." },
    { category: "Methodology and public-interest material", monthlyAud: 250, rationale: "Clear explainers, source links and a fact sheet that can be checked." },
    { category: "Founder-led outreach", monthlyAud: 200, rationale: "Individual, carefully researched approaches and follow-up — not bulk marketing." },
    { category: "Design and content experiments", monthlyAud: 250, rationale: "Small improvements to bill explainers and landing-page comprehension." },
    { category: "Contingency", monthlyAud: 250, rationale: "Keep initial spend capped while the product and message are tested." },
    { category: "Paid promotion", monthlyAud: 0, rationale: "Deferred until the research and organic tests prove a clear, responsible use case." },
  ],
  risks: [
    { risk: "Perception of partisanship", likelihood: "high", mitigation: "Keep language neutral, show all electorates, avoid advocacy framing in B2B pitch." },
    { risk: "People mistake participation figures for polling", likelihood: "high", mitigation: "Use self-selected/not-representative labels in the UI, outreach and every published result." },
    { risk: "Early outreach is read as a request for endorsement", likelihood: "medium", mitigation: "Ask for criticism and feedback; label civic routes separately from journalists and do not imply partnerships." },
    { risk: "Privacy or representativeness concerns", likelihood: "medium", mitigation: "Be explicit about aggregation, verification and sample limits before publishing any result." },
    { risk: "Too much promotion before product evidence", likelihood: "medium", mitigation: "Defer paid promotion and scale only after observed user research and a transparent methodology." },
  ],
};

const VOTER_DATA = {
  personas: [
    { name: "Sarah Nguyen", age: 28, role: "Inner-city renter, Melbourne", motivation: "Wants to feel politically effective without joining a party.", painPoint: "Politics feels noisy, tribal, and disconnected from her real life.", pitch: "Follow the bills that shape your life and record a simple vote — without having to join a debate or write a comment." },
    { name: "Ben Carter", age: 36, role: "Tradesperson, regional Queensland", motivation: "Cares about cost of living, energy, fuel, and jobs. Wants practical politics, not culture-war theatre.", painPoint: "Most political content feels like inner-city argument theatre.", pitch: "Get a straight read on what federal bills mean and record your position without a public comment thread." },
    { name: "Mia Thompson", age: 19, role: "First-time voter, uni student, Adelaide", motivation: "Wants low-friction ways to learn politics and take part without being lectured.", painPoint: "Politics is overwhelming and full of jargon.", pitch: "Read a short explanation of a real bill and vote in minutes; Crossbench does not host comments." },
    { name: "Leila Haddad", age: 41, role: "Busy parent & public sector worker, western Sydney", motivation: "Wants to stay informed but only has short windows of attention.", painPoint: "Can't keep up with every bill, but still wants to contribute meaningfully.", pitch: "Quick bill summaries and a vote in under a minute." },
    { name: "Gavin O'Connor", age: 63, role: "Retiree, community volunteer & news junkie, Perth", motivation: "Loves politics and wants an accessible way to keep track of major bills.", painPoint: "National coverage can make legislative detail hard to follow.", pitch: "Follow a bill from its official source to a plain-English summary and record your own vote." },
  ],
  channels: [
    { channel: "TikTok & Instagram Reels", priority: "high", tactic: "Short bill explainers — one chart per video, one local hook, one CTA to vote. Use native captions and low-production founder voiceovers.", cost: "Low–Medium", expectedROI: "High for awareness and top-of-funnel signups, especially under 35" },
    { channel: "Reddit & community forums", priority: "high", tactic: "Post useful explainers in r/australia, r/AustralianPolitics, city/local subreddits — only when genuinely informative, never spammy.", cost: "Low", expectedROI: "Strong for credibility and organic traffic" },
    { channel: "Email newsletter", priority: "high", tactic: "Weekly 'Bills that matter this week' digest — 3 summaries, one local stat, one big question.", cost: "Low", expectedROI: "Very high for retention and repeat participation" },
    { channel: "PR & earned media", priority: "high", tactic: "Pitch a factual early-stage story only when there is a current bill, a tested explainer and a transparent methodology to show.", cost: "Low", expectedROI: "Useful for validation when the public-interest angle is real" },
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
    "Email": ["Subject: This week in Parliament, in plain English", "Subject: A current bill, explained", "Subject: Record your vote on a federal bill"],
    "Press": ["Crossbench lets Australians follow real federal bills and record a simple support, oppose or abstain vote.", "It is a public-interest civic platform designed to make Parliament more understandable.", "Participant votes are self-selected and are not representative polling."],
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
    { name: "Australian political creators", platform: "Social / newsletter", why: "Can make a well-sourced bill explainer approachable to new audiences.", approach: "Approach only with a useful explainer and clear methodology; avoid claims about local opinion or electoral mandate." },
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
  { id: 1, category: 'LinkedIn', priority: 'high', task: 'Create Crossbench LinkedIn company page', notes: 'Company name: Crossbench · Industry: Technology · Tagline: "Follow federal bills in plain English" · Admin: Jeffa · Parent: EquiM8 Group ABN' },
  { id: 2, category: 'LinkedIn', priority: 'high', task: 'Write company description for LinkedIn page', notes: '2-3 paragraph about section covering the product, mission, and MP value prop. Also draft first announcement post.' },
  { id: 3, category: 'LinkedIn', priority: 'medium', task: 'Generate LinkedIn banner image (1128×191px)', notes: 'Dark background matching brand, logo on left, tagline on right. Can use AI image generation.' },
  { id: 4, category: 'LinkedIn', priority: 'medium', task: 'Post launch announcement on LinkedIn', notes: 'Short founder post: what Crossbench is, why it exists, link to crossbench.io' },
  { id: 5, category: 'Email', priority: 'high', task: 'Set up Cloudflare Email Routing once DNS migrated', notes: 'Routes: privacy@ · abuse@ · info@ → forward to personal email. Free, 2 min setup.' },
  { id: 6, category: 'Email', priority: 'medium', task: 'Verify crossbench.io domain in Resend', notes: 'Currently sending from noreply@crossbench.io — need domain verified for reliable delivery' },
  { id: 7, category: 'Support', priority: 'high', task: 'Build internal support ticket system', notes: 'Users submit tickets → appear in /admin/support · Telegram notification to Jeffa · AI assistant can help users in-thread' },
  { id: 8, category: 'Product', priority: 'medium', task: 'Search/filter on bills page', notes: 'Filter by status, portfolio, chamber, keyword search' },
  { id: 9, category: 'Product', priority: 'medium', task: 'Share-your-vote social card', notes: 'After voting on a bill, users can share their own position and the official bill source — no claims about electorate opinion.' },
  { id: 10, category: 'Product', priority: 'high', task: 'Publish methodology and participation limits', notes: 'Explain self-selected voting, aggregation, privacy and that Crossbench does not provide comments, polling or an electorate mandate.' },
];

const CATEGORIES = ['All', 'LinkedIn', 'Email', 'Support', 'Product'];

function TodoSection() {
  const [catFilter, setCatFilter] = useState('All');
  const [done, setDone] = useState<Set<number>>(new Set());
  const [showDone, setShowDone] = useState(false);

  // Load from localStorage on mount
  useState(() => {
    try {
      const saved = localStorage.getItem('cb_admin_todos_done');
      if (saved) setDone(new Set(JSON.parse(saved)));
    } catch {}
  });

  function toggle(id: number) {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('cb_admin_todos_done', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const allFiltered = (catFilter === 'All' ? TODO_ITEMS : TODO_ITEMS.filter(t => t.category === catFilter));
  const filtered = showDone ? allFiltered : allFiltered.filter(t => !done.has(t.id));
  const doneCount = allFiltered.filter(t => done.has(t.id)).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Tasks & To-Do</h1>
        <span style={{ fontSize: '12px', color: '#2E8B57', fontWeight: 600 }}>{doneCount}/{allFiltered.length} done</span>
      </div>
      <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 14px' }}>Click a task to mark it done. Persists in your browser.</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: catFilter === c ? '#4E8FD4' : '#25324D', backgroundColor: catFilter === c ? '#4E8FD422' : '#111A2E', color: catFilter === c ? '#4E8FD4' : '#7E8AA3' }}>{c}</button>
        ))}
        <button onClick={() => setShowDone(s => !s)} style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #25324D', backgroundColor: '#111A2E', color: '#4A5568' }}>
          {showDone ? 'Hide done' : `Show done (${doneCount})`}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 && <p style={{ color: '#4A5568', fontSize: '13px' }}>All done! 🎉</p>}
        {filtered.map(t => {
          const isDone = done.has(t.id);
          return (
            <div key={t.id} onClick={() => toggle(t.id)} style={{ backgroundColor: isDone ? '#0A1408' : '#0E1628', border: `1px solid ${isDone ? '#2E8B5733' : '#1C2940'}`, borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '12px', alignItems: 'start', cursor: 'pointer', opacity: isDone ? 0.55 : 1, transition: 'opacity 0.15s' }}>
              <span style={{ fontSize: '16px', marginTop: '1px', userSelect: 'none' }}>{isDone ? '✅' : '⬜'}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: t.category === 'LinkedIn' ? '#0A66C222' : t.category === 'Support' ? '#2E8B5722' : t.category === 'Email' ? '#D6A94A22' : '#7E8AA322', color: t.category === 'LinkedIn' ? '#0A66C2' : t.category === 'Support' ? '#2E8B57' : t.category === 'Email' ? '#D6A94A' : '#7E8AA3', border: '1px solid', borderColor: t.category === 'LinkedIn' ? '#0A66C255' : t.category === 'Support' ? '#2E8B5755' : t.category === 'Email' ? '#D6A94A55' : '#7E8AA355', whiteSpace: 'nowrap' }}>{t.category}</span>
              <div>
                <div style={{ fontWeight: 600, color: isDone ? '#4A5568' : '#F5F7FB', fontSize: '14px', marginBottom: '4px', textDecoration: isDone ? 'line-through' : 'none' }}>{t.task}</div>
                <div style={{ fontSize: '12px', color: '#3A4A5A', lineHeight: 1.5 }}>{t.notes}</div>
              </div>
              {badge(t.priority)}
            </div>
          );
        })}
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
        <p className="text-[#7E8AA3] text-sm mt-1">Validation-first plan · Updated 8 Sep 2026</p>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #25324D' }}>
        {([['mps', '🏛️ Political & Civic Feedback'], ['voters', '🗳️ Public Participation'], ['todo', '✅ Tasks & To-Do']] as [Tab, string][]).map(([t, label]) => (
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
        <div className="space-y-6">
        {tab === 'mps' && <Section title="Launch position — validate before scaling">
          <p style={{ color: '#DDE5F2', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>Crossbench helps people follow federal bills in plain English and record a support, oppose or abstain vote. It does not host comments. Participation is self-selected, not representative polling, an electorate survey or a public mandate.</p>
          <p style={{ color: '#7E8AA3', fontSize: '13px', lineHeight: 1.6, margin: '12px 0 0' }}>The immediate goal is evidence: learn where people struggle, publish a transparent methodology, and make a small number of individually reviewed requests for feedback. Paid promotion stays deferred until that work proves a responsible message and useful experience.</p>
          <a href="/admin/media" style={{ display: 'inline-block', color: '#4E8FD4', fontSize: '13px', fontWeight: 700, marginTop: '12px' }}>Open the source-linked media and civic feedback directory →</a>
        </Section>}
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
        </div>
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
