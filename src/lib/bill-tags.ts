// src/lib/bill-tags.ts
// Derives visual tags for bill cards based on status, chamber, and stage data

export type BillTag = {
  label: string;
  color: string;       // text colour
  bg: string;          // background
  border?: string;     // optional border
  pulse?: boolean;     // show live indicator dot
};

/**
 * Maps a bill's status + chamber to one or more display tags.
 * Tags communicate where a bill is in the legislative process in plain English.
 */
export function getBillTags(bill: {
  status: string;
  chamber: string;
  portfolio?: string | null;
}): BillTag[] {
  const tags: BillTag[] = [];
  const status = (bill.status || '').toLowerCase();

  // --- Location tag ---
  if (
    status.includes('committee') ||
    status.includes('inquiry') ||
    status.includes('review')
  ) {
    tags.push({
      label: 'With committee',
      color: '#D6A94A',
      bg: 'rgba(214,169,74,0.15)',
      pulse: true,
    });
  } else if (
    status.includes('parliament') ||
    status.includes('before the house') ||
    status.includes('before the senate') ||
    status.includes('reading') ||
    status.includes('debate')
  ) {
    tags.push({
      label: 'Before parliament',
      color: '#2E8B57',
      bg: 'rgba(46,139,87,0.15)',
      pulse: true,
    });
  } else if (status.includes('passed') || status.includes('royal assent')) {
    tags.push({
      label: 'Passed',
      color: '#B6C0D1',
      bg: 'rgba(182,192,209,0.12)',
    });
  } else if (status.includes('withdrawn') || status.includes('lapsed')) {
    tags.push({
      label: 'Lapsed',
      color: '#7E8AA3',
      bg: 'rgba(126,138,163,0.12)',
    });
  } else {
    // Default: show the raw status as a neutral tag
    tags.push({
      label: bill.status,
      color: '#2E8B57',
      bg: 'rgba(46,139,87,0.15)',
      pulse: true,
    });
  }

  // --- Chamber tag ---
  if (bill.chamber === 'HOUSE') {
    tags.push({ label: 'House of Reps', color: '#B6C0D1', bg: 'rgba(182,192,209,0.1)' });
  } else if (bill.chamber === 'SENATE') {
    tags.push({ label: 'Senate', color: '#B6C0D1', bg: 'rgba(182,192,209,0.1)' });
  } else if (bill.chamber === 'JOINT') {
    tags.push({ label: 'Joint', color: '#B6C0D1', bg: 'rgba(182,192,209,0.1)' });
  }

  return tags;
}
