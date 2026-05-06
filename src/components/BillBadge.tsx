import type { BillTag } from '@/lib/bill-tags';

type BillBadgeProps = {
  tag: BillTag;
};

export default function BillBadge({ tag }: BillBadgeProps) {
  return (
    <span
      style={{
        backgroundColor: tag.bg,
        color: tag.color,
        border: `1px solid ${tag.border ?? 'rgba(182,192,209,0.16)'}`,
        fontSize: '11px',
        lineHeight: 1,
        padding: '5px 9px',
        borderRadius: '999px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {tag.label}
    </span>
  );
}
