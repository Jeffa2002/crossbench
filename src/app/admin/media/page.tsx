import { MEDIA_CONTACTS, buildMediaOutreachEmail } from '@/lib/media-outreach';

export const dynamic = 'force-dynamic';

const cardStyle: React.CSSProperties = {
  backgroundColor: '#111A2E',
  border: '1px solid #25324D',
  borderRadius: '12px',
  padding: '18px',
};

const muted: React.CSSProperties = { color: '#7E8AA3' };

function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'good' | 'warn' }) {
  const colors = {
    default: { bg: '#16213A', fg: '#B6C0D1', border: '#25324D' },
    good: { bg: '#123524', fg: '#7EE0A1', border: '#2E8B57' },
    warn: { bg: '#3A2A12', fg: '#F2C46B', border: '#8A6A24' },
  }[tone];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: '999px',
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      color: colors.fg,
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

export default function AdminMediaPage() {
  const tier1 = MEDIA_CONTACTS.filter(contact => contact.priority === 'Tier 1').length;
  const withEmail = MEDIA_CONTACTS.filter(contact => contact.email).length;
  const sample = buildMediaOutreachEmail(MEDIA_CONTACTS[0]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Media Outreach</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">
          Political journalists, press-gallery targets, and the journalist-specific launch pitch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Contacts researched', value: MEDIA_CONTACTS.length },
          { label: 'Tier 1 targets', value: tier1 },
          { label: 'Verified direct emails', value: withEmail },
          { label: 'Needs contact review', value: MEDIA_CONTACTS.length - withEmail },
        ].map(item => (
          <div key={item.label} style={cardStyle}>
            <div className="text-2xl font-bold text-[#F5F7FB]">{item.value}</div>
            <div className="text-xs text-[#7E8AA3] mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section style={cardStyle}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Research List</h2>
              <p className="text-sm text-[#7E8AA3] mt-1">
                Direct sends stay blocked until a journalist or newsroom email is verified.
              </p>
            </div>
            <Badge tone={withEmail > 0 ? 'good' : 'warn'}>{withEmail} send-ready</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#25324D] text-xs uppercase tracking-wide text-[#7E8AA3]">
                  <th className="py-3 pr-4 font-semibold">Journalist</th>
                  <th className="py-3 pr-4 font-semibold">Outlet / role</th>
                  <th className="py-3 pr-4 font-semibold">Priority</th>
                  <th className="py-3 pr-4 font-semibold">Contact</th>
                  <th className="py-3 pr-4 font-semibold">Pitch angle</th>
                  <th className="py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {MEDIA_CONTACTS.map(contact => (
                  <tr key={contact.id} className="border-b border-[#1A2540] align-top">
                    <td className="py-4 pr-4 min-w-[180px]">
                      <div className="font-semibold text-[#F5F7FB]">{contact.name}</div>
                      <div className="text-xs text-[#7E8AA3] mt-1">{contact.beat}</div>
                    </td>
                    <td className="py-4 pr-4 min-w-[220px]">
                      <div className="text-[#DDE5F2]">{contact.outlet}</div>
                      <div className="text-xs text-[#7E8AA3] mt-1">{contact.role}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge tone={contact.priority === 'Tier 1' ? 'good' : 'default'}>{contact.priority}</Badge>
                    </td>
                    <td className="py-4 pr-4 min-w-[190px]">
                      {contact.email ? (
                        <div className="text-[#7EE0A1] text-xs break-all">{contact.email}</div>
                      ) : (
                        <div>
                          <Badge tone="warn">Needs email</Badge>
                          <div className="text-xs text-[#7E8AA3] mt-2">{contact.contactRoute}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-4 min-w-[280px] text-xs leading-relaxed text-[#B6C0D1]">
                      {contact.pitchAngle}
                    </td>
                    <td className="py-4 min-w-[160px]">
                      <a href={contact.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-[#7CC4FF] hover:underline">
                        {contact.sourceLabel}
                      </a>
                      <div className="text-xs text-[#4E5A73] mt-2">{contact.notes}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section style={cardStyle}>
            <h2 className="text-lg font-semibold">Send Guardrails</h2>
            <div className="space-y-3 mt-4 text-sm" style={muted}>
              <p>Media outreach is separate from MP/Senator outreach and uses its own campaign names.</p>
              <p>The send script defaults to dry-run. Real sends require <code className="text-[#F5F7FB]">--send</code>.</p>
              <p>Contacts without verified direct emails are skipped, so this page is safe as a research list.</p>
              <p>Replies should use <code className="text-[#F5F7FB]">support+media@crossbench.io</code> so they become support tickets and Telegram notifications.</p>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 className="text-lg font-semibold">Draft Email</h2>
            <div className="mt-4 rounded-lg border border-[#25324D] bg-[#0B1220] p-4">
              <div className="text-xs uppercase tracking-wide text-[#7E8AA3] mb-2">Subject</div>
              <div className="text-sm font-semibold text-[#F5F7FB]">{sample.subject}</div>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-[#25324D] bg-[#0B1220] p-4 text-xs leading-relaxed text-[#B6C0D1]">
              {sample.plain}
            </pre>
          </section>
        </aside>
      </div>
    </div>
  );
}
