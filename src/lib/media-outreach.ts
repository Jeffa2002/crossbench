export type MediaContact = {
  id: string;
  name: string;
  outlet: string;
  role: string;
  priority: 'Tier 1' | 'Tier 2';
  beat: string;
  email?: string;
  contactRoute: string;
  sourceUrl: string;
  sourceLabel: string;
  pitchAngle: string;
  notes: string;
};

export const MEDIA_CONTACTS: MediaContact[] = [
  {
    id: 'david-speers',
    name: 'David Speers',
    outlet: 'ABC News',
    role: 'National political lead and Insiders host',
    priority: 'Tier 1',
    beat: 'Federal politics, Sunday agenda-setting, interviews',
    contactRoute: 'ABC News / Insiders editorial channels',
    sourceUrl: 'https://www.abc.net.au/news/david-speers/11841154',
    sourceLabel: 'ABC profile',
    pitchAngle: 'Crossbench as a new data point for bill-by-bill electorate sentiment before Sunday panels and sitting-week interviews.',
    notes: 'High-reach national political audience. Strong fit for non-partisan bill and electorate signal stories.',
  },
  {
    id: 'patricia-karvelas',
    name: 'Patricia Karvelas',
    outlet: 'ABC News / Radio National',
    role: 'Afternoon Briefing host, Party Room co-host',
    priority: 'Tier 1',
    beat: 'Federal politics, social policy, interviews, podcasts',
    contactRoute: 'ABC News / Radio National editorial channels',
    sourceUrl: 'https://www.abc.net.au/news/patricia-karvelas/6086082',
    sourceLabel: 'ABC profile',
    pitchAngle: 'A live, explainable signal for how participating voters are responding to social and economic legislation.',
    notes: 'Good fit for explainer and interview formats.',
  },
  {
    id: 'laura-tingle',
    name: 'Laura Tingle',
    outlet: 'ABC News',
    role: 'Global affairs editor; former 7.30 political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, policy, institutions, analysis',
    contactRoute: 'ABC News editorial channels',
    sourceUrl: 'https://www.abc.net.au/news/laura-tingle/9711054',
    sourceLabel: 'ABC profile',
    pitchAngle: 'Crossbench as civic infrastructure: translating Parliament into public-facing, local, bill-level engagement.',
    notes: 'Best suited to bigger democratic-participation and institutional transparency angle.',
  },
  {
    id: 'jane-norman',
    name: 'Jane Norman',
    outlet: 'ABC News',
    role: 'National affairs correspondent, Parliament House',
    priority: 'Tier 1',
    beat: 'Federal politics, Parliament House, national affairs',
    contactRoute: 'ABC News Canberra bureau/editorial channels',
    sourceUrl: 'https://www.abc.net.au/news/jane-norman/5873958',
    sourceLabel: 'ABC profile',
    pitchAngle: 'Electorate and chamber-level public sentiment on bills as a reporting aid during sitting weeks.',
    notes: 'Strong fit for public-interest and Parliament House reporting.',
  },
  {
    id: 'jacob-greber',
    name: 'Jacob Greber',
    outlet: 'ABC 7.30',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, economics, policy, current affairs',
    contactRoute: 'ABC 7.30 editorial channels',
    sourceUrl: 'https://www.abc.net.au/news/2025-06-12/jacob-greber-announced-as-7.30s-new-political/105411222',
    sourceLabel: 'ABC announcement',
    pitchAngle: 'A visual, evidence-led angle for how bill debates are landing across electorates.',
    notes: 'Good fit for charts and explainers tied to a live bill or budget measure.',
  },
  {
    id: 'casey-briggs',
    name: 'Casey Briggs',
    outlet: 'ABC News',
    role: 'Chief elections and data analyst',
    priority: 'Tier 1',
    beat: 'Elections, data analysis, political geography',
    contactRoute: 'ABC News data/elections team',
    sourceUrl: 'https://www.abc.net.au/news/casey-briggs/7300030',
    sourceLabel: 'ABC profile',
    pitchAngle: 'Crossbench as a new source of verified electorate-level participation data between elections.',
    notes: 'Best fit for methodology, data quality, and visualisation walkthroughs.',
  },
  {
    id: 'phillip-coorey',
    name: 'Phillip Coorey',
    outlet: 'Australian Financial Review',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, business, tax, budget, Canberra',
    email: 'pcoorey@afr.com',
    contactRoute: 'AFR newsroom/editorial channels',
    sourceUrl: 'https://www.afr.com/by/phillip-coorey-hve1e',
    sourceLabel: 'AFR profile',
    pitchAngle: 'Policy and budget bills with electorate-level reaction, especially where business impact meets political pressure.',
    notes: 'Strong fit for policy-heavy Crossbench data stories.',
  },
  {
    id: 'tom-mcilroy',
    name: 'Tom McIlroy',
    outlet: 'Guardian Australia',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, accountability, Canberra',
    contactRoute: 'Guardian Australia editorial channels',
    sourceUrl: 'https://www.theguardian.com/profile/tom-mcilroy',
    sourceLabel: 'Guardian profile',
    pitchAngle: 'A neutral transparency layer showing how participating voters respond to bills and MPs before public launch.',
    notes: 'Good fit for launch story and democracy/transparency framing.',
  },
  {
    id: 'josh-butler',
    name: 'Josh Butler',
    outlet: 'Guardian Australia',
    role: 'Chief of staff and political reporter',
    priority: 'Tier 1',
    beat: 'Federal politics, health, welfare, tech, disinformation, housing',
    contactRoute: 'Guardian Australia editorial channels',
    sourceUrl: 'https://au.linkedin.com/in/josh-butler-aa845236',
    sourceLabel: 'LinkedIn profile',
    pitchAngle: 'How a civic platform verifies electorate participation and avoids petition-style noise.',
    notes: 'Strong fit for tech, social impact, and voter-participation angle.',
  },
  {
    id: 'samantha-maiden',
    name: 'Samantha Maiden',
    outlet: 'news.com.au',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, breaking stories, national political news',
    email: 'samantha.maiden@news.com.au',
    contactRoute: 'news.com.au editorial channels',
    sourceUrl: 'https://www.news.com.au/the-team/samantha-maiden',
    sourceLabel: 'news.com.au profile',
    pitchAngle: 'A new Australian civic platform inviting MPs and Senators to sign in before public launch.',
    notes: 'High-reach digital politics audience. Strong launch/newsworthiness fit.',
  },
  {
    id: 'andrew-clennell',
    name: 'Andrew Clennell',
    outlet: 'Sky News Australia',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, agenda-setting commentary, interviews',
    contactRoute: 'Sky News newsroom/editorial channels',
    sourceUrl: 'https://www.skynews.com.au/the-team/andrew-clennell',
    sourceLabel: 'Sky News profile',
    pitchAngle: 'New data and dashboards for how voters are responding to legislation and party/member sentiment.',
    notes: 'Good fit for political-cycle and launch coverage.',
  },
  {
    id: 'tom-connell',
    name: 'Tom Connell',
    outlet: 'Sky News Australia',
    role: 'Political host and reporter',
    priority: 'Tier 1',
    beat: 'Federal politics, interviews, elections, Canberra',
    contactRoute: 'Sky News / National Press Club channels',
    sourceUrl: 'https://npc.org.au/our-people',
    sourceLabel: 'National Press Club profile',
    pitchAngle: 'Crossbench as a live, non-partisan election-and-legislation participation layer.',
    notes: 'Good fit for host/interviewer briefing and launch visibility.',
  },
  {
    id: 'kieran-gilbert',
    name: 'Kieran Gilbert',
    outlet: 'Sky News Australia',
    role: 'Chief news anchor',
    priority: 'Tier 1',
    beat: 'Federal politics, Parliament House broadcasting',
    contactRoute: 'Sky News Canberra bureau/editorial channels',
    sourceUrl: 'https://www.victorianchamber.com.au/profile/kieran-gilbert',
    sourceLabel: 'Victorian Chamber profile',
    pitchAngle: 'A Parliament House-facing platform that makes federal bills and local voter responses easier to explain.',
    notes: 'Strong Canberra broadcast audience.',
  },
  {
    id: 'mark-riley',
    name: 'Mark Riley',
    outlet: 'Seven News',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, TV news, Canberra',
    contactRoute: 'Seven News Canberra bureau/editorial channels',
    sourceUrl: 'https://thewest.com.au/profile/mark-riley',
    sourceLabel: 'Seven West profile',
    pitchAngle: 'A clean TV-friendly visual story: live electorate views on bills and the MPs invited to claim dashboards.',
    notes: 'Good fit for mainstream launch angle and visuals.',
  },
  {
    id: 'andrew-probyn',
    name: 'Andrew Probyn',
    outlet: 'Nine News',
    role: 'National affairs editor',
    priority: 'Tier 1',
    beat: 'Federal politics, national affairs, investigations',
    contactRoute: 'Nine News editorial channels',
    sourceUrl: 'https://www.nine.com.au/australia-news/andrew-probyn-joins-9news-as-national-affairs-editor-20231022-p5ywbq.html',
    sourceLabel: 'Nine announcement',
    pitchAngle: 'Crossbench as a national-affairs story about citizens engaging with legislation outside election cycles.',
    notes: 'Good fit for national launch and accountability framing.',
  },
  {
    id: 'charles-croucher',
    name: 'Charles Croucher',
    outlet: 'Nine News',
    role: 'Political editor',
    priority: 'Tier 1',
    beat: 'Federal politics, TV news, budget coverage',
    contactRoute: 'Nine News Canberra bureau/editorial channels',
    sourceUrl: 'https://www.nine.com.au/australia-news/videos/andrew-probyn-and-charles-croucher-break-down-the-2026-federal-budget/cmp2h3y1p000a0hqhm62ljnb9',
    sourceLabel: 'Nine coverage page',
    pitchAngle: 'A concise launch story with visual dashboards for electorates, parties, and live bill sentiment.',
    notes: 'Best approached with a short visual briefing, not a long text pitch.',
  },
  {
    id: 'james-massola',
    name: 'James Massola',
    outlet: 'The Age / Sydney Morning Herald',
    role: 'Chief political commentator',
    priority: 'Tier 1',
    beat: 'Federal politics, commentary, national affairs',
    contactRoute: 'Nine publishing editorial channels',
    sourceUrl: 'https://muckrack.com/jamesmassola',
    sourceLabel: 'Muck Rack profile',
    pitchAngle: 'A democratic participation angle: whether politicians can see local voter signal before they vote.',
    notes: 'Good fit for deeper politics/commentary treatment.',
  },
  {
    id: 'katina-curtis',
    name: 'Katina Curtis',
    outlet: 'The West Australian',
    role: 'Canberra bureau chief',
    priority: 'Tier 1',
    beat: 'Federal politics, WA lens, Canberra',
    contactRoute: 'The West Australian Canberra bureau/editorial channels',
    sourceUrl: 'https://thewest.com.au/profile/katina-curtis',
    sourceLabel: 'The West Australian profile',
    pitchAngle: 'Western Australian electorate and Senate angles on live federal bills.',
    notes: 'Useful for WA-specific media outreach and Senate stories.',
  },
  {
    id: 'anna-henderson',
    name: 'Anna Henderson',
    outlet: 'SBS News',
    role: 'Chief political correspondent and bureau chief',
    priority: 'Tier 1',
    beat: 'Federal politics, multicultural audiences, Canberra',
    contactRoute: 'SBS News editorial channels',
    sourceUrl: 'https://npc.org.au/our-people',
    sourceLabel: 'National Press Club profile',
    pitchAngle: 'A plain-English, multilingual-friendly civic platform for people who want to understand federal bills.',
    notes: 'Strong fit for access, civic literacy, and participation framing.',
  },
  {
    id: 'claudia-long',
    name: 'Claudia Long',
    outlet: 'ABC News',
    role: 'Federal politics reporter',
    priority: 'Tier 2',
    beat: 'Federal politics, NDIS, education, women and children',
    contactRoute: 'ABC News editorial channels',
    sourceUrl: 'https://www.abc.net.au/news/claudia-long/9943602',
    sourceLabel: 'ABC profile',
    pitchAngle: 'Issue-specific Crossbench data when a bill touches NDIS, education, or family policy.',
    notes: 'Better for targeted bill stories than general launch.',
  },
  {
    id: 'jasmin-teurlings',
    name: 'Jasmin Teurlings',
    outlet: 'Seven News',
    role: 'Federal political reporter',
    priority: 'Tier 2',
    beat: 'Federal politics, Seven Canberra bureau',
    contactRoute: 'Seven News Canberra bureau/editorial channels',
    sourceUrl: 'https://www.adelaidenow.com.au/entertainment/7news-adelaides-jasmin-teurlings-joins-networks-canberra-bureau-as-federal-politics-reporter/news-story/12a78efe005170b917e32b85be10865c',
    sourceLabel: 'Adelaide Now report',
    pitchAngle: 'A new Canberra tool with local electorate and South Australian media angles.',
    notes: 'Good for newer gallery connection and practical explainers.',
  },
  {
    id: 'dennis-shanahan',
    name: 'Dennis Shanahan',
    outlet: 'The Australian',
    role: 'National editor, former political editor',
    priority: 'Tier 2',
    beat: 'Federal politics, national commentary, Canberra',
    contactRoute: 'The Australian editorial channels',
    sourceUrl: 'https://www.theaustralian.com.au/author/dennis-shanahan',
    sourceLabel: 'The Australian author profile',
    pitchAngle: 'Crossbench as a new civic-tech participation layer in the federal political ecosystem.',
    notes: 'Good for senior editorial awareness, less likely first cold pitch target.',
  },
  {
    id: 'federal-press-gallery',
    name: 'Federal Parliamentary Press Gallery committee',
    outlet: 'Canberra Press Gallery',
    role: 'Press gallery contact point',
    priority: 'Tier 2',
    beat: 'Parliament House media coordination',
    email: 'admin@pressgallery.net.au',
    contactRoute: 'admin@pressgallery.net.au',
    sourceUrl: 'https://pressgallery.net.au/',
    sourceLabel: 'Press Gallery site',
    pitchAngle: 'Offer a short neutral briefing to gallery members about Crossbench as a new public-interest platform.',
    notes: 'Use carefully for a briefing request, not as a substitute for individual journalist pitches.',
  },
  {
    id: 'guardian-australia-editorial',
    name: 'Guardian Australia editorial desk',
    outlet: 'Guardian Australia',
    role: 'Editorial contact',
    priority: 'Tier 2',
    beat: 'Editorial inquiries and story tips',
    email: 'australia@theguardian.com',
    contactRoute: 'australia@theguardian.com',
    sourceUrl: 'https://www.theguardian.com/info/2013/may/26/contact-guardian-australia',
    sourceLabel: 'Guardian Australia contact page',
    pitchAngle: 'A story tip for the politics desk about Crossbench as a new public-interest bill sentiment source.',
    notes: 'General editorial route, not a named journalist address.',
  },
  {
    id: 'nine-news-newsroom',
    name: '9News newsroom',
    outlet: '9News',
    role: 'News story contact',
    priority: 'Tier 2',
    beat: 'National news tips',
    email: 'contact@9news.com.au',
    contactRoute: 'contact@9news.com.au',
    sourceUrl: 'https://www.nine.com.au/contact-us',
    sourceLabel: 'Nine contact page',
    pitchAngle: 'A newsroom tip about a new civic platform with visual electorate and bill sentiment data.',
    notes: 'General newsroom route, not a named journalist address.',
  },
  {
    id: 'seven-news-newsroom',
    name: '7NEWS newsroom',
    outlet: '7NEWS',
    role: 'News tip contact',
    priority: 'Tier 2',
    beat: 'National news tips',
    email: '7ndtips@seven.com.au',
    contactRoute: '7ndtips@seven.com.au',
    sourceUrl: 'https://7news.com.au/contact-us',
    sourceLabel: '7NEWS contact page',
    pitchAngle: 'A newsroom tip about Crossbench with a TV-friendly visual angle around electorates and bills.',
    notes: 'General newsroom route, not a named journalist address.',
  },
];

function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

export function buildMediaOutreachEmail(contact: MediaContact) {
  const subject = 'Crossbench: a new source for electorate-level bill sentiment';
  const greeting = contact.id === 'federal-press-gallery' ? 'Hello' : `Hi ${firstName(contact.name)}`;
  const plain = `${greeting},

I am writing to introduce Crossbench, a new independent civic platform that helps Australians understand federal bills and record whether they support, oppose, or abstain on legislation before Parliament.

For journalists, the useful part is the public-interest signal around bills: plain-English summaries, official bill text, electorate and national participation, public Crossbench voting, Politics Pulse, and member/party sentiment views. Crossbench is not a scientific population poll and not party-affiliated; it is a structured participation layer showing how verified users on the platform are engaging with real federal legislation.

We are inviting MPs and Senators to sign in before the wider public launch so offices can review their profiles and be ready as constituents start using the service. For the press gallery and political journalists, we can provide a short walkthrough, issue-specific data notes, or visual examples tied to current bills.

Useful starting points:

- Bills: https://crossbench.io/bills
- Politics Pulse: https://crossbench.io/sentiment
- Parliament view: https://crossbench.io/parliament
- Methodology: https://crossbench.io/methodology

Why this may be useful for your coverage:

- Spot which bills are attracting support, opposition, or confusion among participating users.
- Compare public Crossbench responses across electorates and nationally.
- See where member or party sentiment is shifting.
- Use plain-English summaries and official bill text links when covering legislation.

If you would like a walkthrough or a short data note on a current bill, just reply to this email and it will go into the Crossbench support queue.

Regards,
Crossbench
https://crossbench.io`;

  const html = `<p>${greeting},</p>
<p>I am writing to introduce <strong>Crossbench</strong>, a new independent civic platform that helps Australians understand federal bills and record whether they support, oppose, or abstain on legislation before Parliament.</p>
<p>For journalists, the useful part is the public-interest signal around bills: plain-English summaries, official bill text, electorate and national participation, public Crossbench voting, Politics Pulse, and member/party sentiment views. Crossbench is not a scientific population poll and not party-affiliated; it is a structured participation layer showing how verified users on the platform are engaging with real federal legislation.</p>
<p>We are inviting MPs and Senators to sign in before the wider public launch so offices can review their profiles and be ready as constituents start using the service. For the press gallery and political journalists, we can provide a short walkthrough, issue-specific data notes, or visual examples tied to current bills.</p>
<p><strong>Useful starting points:</strong></p>
<ul>
  <li><a href="https://crossbench.io/bills">Bills</a></li>
  <li><a href="https://crossbench.io/sentiment">Politics Pulse</a></li>
  <li><a href="https://crossbench.io/parliament">Parliament view</a></li>
  <li><a href="https://crossbench.io/methodology">Methodology</a></li>
</ul>
<p><strong>Why this may be useful for your coverage:</strong></p>
<ul>
  <li>Spot which bills are attracting support, opposition, or confusion among participating users.</li>
  <li>Compare public Crossbench responses across electorates and nationally.</li>
  <li>See where member or party sentiment is shifting.</li>
  <li>Use plain-English summaries and official bill text links when covering legislation.</li>
</ul>
<p>If you would like a walkthrough or a short data note on a current bill, just reply to this email and it will go into the Crossbench support queue.</p>
<p>Regards,<br>Crossbench<br><a href="https://crossbench.io">https://crossbench.io</a></p>`;

  return { subject, plain, html };
}
