export type MpUpdate = {
  date: string;
  label: string;
  title: string;
  summary: string;
  details: string[];
};

export const mpUpdates: MpUpdate[] = [
  {
    date: '11 Jun 2026',
    label: 'Access',
    title: 'MP dashboards are now free during early access',
    summary: 'MPs and Senators can use Crossbench without payment while the platform builds verified constituent participation.',
    details: [
      'APH email sign-in now unlocks the MP dashboard immediately.',
      'Existing MP accounts have been moved to active free early access.',
      'Paid office workflows can come later, once there is enough constituent signal to make them clearly useful.',
    ],
  },
  {
    date: '11 Jun 2026',
    label: 'Profiles',
    title: 'Registered MP and Senator badges are live',
    summary: 'Public electorate and member profiles now show when the office has registered to use Crossbench.',
    details: [
      'The badge appears only when a registered MP account matches the official APH email on the profile.',
      'Directory cards, electorate profiles, and MP profile pages all use the same badge.',
      'Internal test accounts do not trigger the public badge.',
    ],
  },
  {
    date: '10 Jun 2026',
    label: 'Support',
    title: 'Support ticket replies now send by email',
    summary: 'Admin replies to support tickets are sent back through Resend and remain attached to the support thread.',
    details: [
      'Support ticket IDs now use the CS01000 sequence.',
      'Replies use per-ticket reply addresses so follow-up emails can attach back to the same ticket.',
      'Inbound email tickets can generate AI-assisted reply suggestions for support staff.',
    ],
  },
];
