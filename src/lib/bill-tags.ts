// src/lib/bill-tags.ts
// One shared badge vocabulary for bill cards and bill detail headers.

export type BillTag = {
  label: string;
  color: string;
  bg: string;
  border?: string;
};

const TAG_STYLE = {
  active: { color: '#7DD8A3', bg: 'rgba(46,139,87,0.12)', border: 'rgba(46,139,87,0.32)' },
  passed: { color: '#7DD8A3', bg: 'rgba(46,139,87,0.12)', border: 'rgba(46,139,87,0.32)' },
  failed: { color: '#F08A7C', bg: 'rgba(217,92,75,0.12)', border: 'rgba(217,92,75,0.30)' },
  neutral: { color: '#B6C0D1', bg: 'rgba(182,192,209,0.08)', border: 'rgba(182,192,209,0.18)' },
  gold: { color: '#D6A94A', bg: 'rgba(214,169,74,0.11)', border: 'rgba(214,169,74,0.28)' },
  blue: { color: '#8FB7F1', bg: 'rgba(78,143,212,0.12)', border: 'rgba(78,143,212,0.28)' },
};

function statusTag(bill: { status: string; outcome?: string | null; parliamentNumber?: number | null }): BillTag {
  if (bill.status === 'Before Parliament' && bill.parliamentNumber && bill.parliamentNumber < 48) {
    return { label: 'Lapsed', ...TAG_STYLE.neutral };
  }

  const outcome = bill.outcome || bill.status;
  if (outcome === 'Passed' || outcome === 'Assented') return { label: 'Passed', ...TAG_STYLE.passed };
  if (outcome === 'Not Passed' || outcome === 'Defeated') return { label: 'Not passed', ...TAG_STYLE.failed };
  if (outcome === 'Lapsed' || outcome === 'Withdrawn') return { label: 'Lapsed', ...TAG_STYLE.neutral };
  if (bill.status === 'Before Parliament') return { label: 'Before parliament', ...TAG_STYLE.active };

  return { label: bill.status || 'Status unknown', ...TAG_STYLE.neutral };
}

function chamberTag(chamber: string): BillTag {
  if (chamber === 'HOUSE') return { label: 'House of Reps', ...TAG_STYLE.blue };
  if (chamber === 'SENATE') return { label: 'Senate', ...TAG_STYLE.blue };
  if (chamber === 'JOINT') return { label: 'Joint', ...TAG_STYLE.blue };
  return { label: chamber || 'Chamber unknown', ...TAG_STYLE.neutral };
}

export function makeBillTag(label: string, tone: keyof typeof TAG_STYLE = 'neutral'): BillTag {
  return { label, ...TAG_STYLE[tone] };
}

/**
 * Listing cards should display only the two strongest tags: status + chamber.
 * Detail pages can add extra metadata with makeBillTag while preserving style.
 */
export function getBillTags(bill: {
  status: string;
  chamber: string;
  outcome?: string | null;
  parliamentNumber?: number | null;
}): BillTag[] {
  return [statusTag(bill), chamberTag(bill.chamber)];
}
