export type MpUpdate = {
  date: string;
  label: string;
  title: string;
  summary: string;
  details: string[];
};

export const mpUpdates: MpUpdate[] = [
  {
    date: '12 Jun 2026',
    label: 'Media release',
    title: 'Crossbench launches office staff access for MPs and Senators',
    summary: 'Crossbench is now available to parliamentary offices as a shared office workspace, allowing MPs and Senators to invite trusted APH staff into their electorate or Senate dashboard.',
    details: [
      'Why it matters: parliamentary offices are team environments, and constituent sentiment is most useful when chiefs of staff, advisers, electorate officers, and digital staff can access the same live picture.',
      'Principals can invite @aph.gov.au staff as staffers or office admins, giving offices control over who can view the dashboard and who can help manage access.',
      'Office admins can invite, block, remove, and manage the staff accounts they create, while principal MP and Senator accounts remain protected.',
      'Every office access change is audited, so invitations, removals, blocks, unblocks, and role changes have a clear record.',
      'Available now: signed-in MPs and Senators can open the MP dashboard and use the Staff access area to start inviting their office team.',
    ],
  },
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
