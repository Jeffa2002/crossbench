type CrossbenchRegisteredBadgeProps = {
  compact?: boolean;
};

export default function CrossbenchRegisteredBadge({ compact = false }: CrossbenchRegisteredBadgeProps) {
  return (
    <span
      title="Registered to use Crossbench"
      aria-label="Registered to use Crossbench"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '5px' : '7px',
        width: 'fit-content',
        minHeight: compact ? '22px' : '28px',
        padding: compact ? '3px 8px 3px 4px' : '5px 11px 5px 5px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, rgba(78,143,212,0.22), rgba(46,139,87,0.18))',
        border: '1px solid rgba(97, 181, 255, 0.38)',
        boxShadow: compact ? '0 6px 18px rgba(46,139,87,0.12)' : '0 10px 30px rgba(78,143,212,0.18)',
        color: '#DFF7EA',
        fontSize: compact ? '10px' : '12px',
        fontWeight: 800,
        letterSpacing: '0.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? '16px' : '20px',
          height: compact ? '16px' : '20px',
          borderRadius: '999px',
          backgroundColor: '#DFF7EA',
          color: '#0B1220',
          fontSize: compact ? '8px' : '9px',
          fontWeight: 900,
          boxShadow: 'inset 0 0 0 1px rgba(11,18,32,0.08)',
        }}
      >
        CB
      </span>
      <span>{compact ? 'Registered' : 'Crossbench registered'}</span>
    </span>
  );
}
