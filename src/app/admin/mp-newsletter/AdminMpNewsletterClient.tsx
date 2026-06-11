'use client';

import { FormEvent, useState } from 'react';

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  electorate: string | null;
  active: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
};

type MissingMp = {
  email: string;
  name: string | null;
  electorate: string | null;
  status: string;
};

type Campaign = {
  id: string;
  subject: string;
  recipientMode: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
};

type AdminMpNewsletterClientProps = {
  subscribers: Subscriber[];
  missingMps: MissingMp[];
  campaigns: Campaign[];
};

type SendState = 'idle' | 'sending' | 'sent' | 'error';

export default function AdminMpNewsletterClient({ subscribers, missingMps, campaigns }: AdminMpNewsletterClientProps) {
  const [state, setState] = useState<SendState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [recipientMode, setRecipientMode] = useState<'test' | 'active'>('test');

  const activeSubscribers = subscribers.filter(subscriber => subscriber.active);
  const inactiveSubscribers = subscribers.filter(subscriber => !subscriber.active);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch('/api/admin/mp-newsletter/send', { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));

    if (!res.ok && res.status !== 207) {
      setState('error');
      setMessage(data.error || 'Newsletter send failed.');
      return;
    }

    setState(data.failedCount ? 'error' : 'sent');
    setMessage(`Sent ${data.sentCount || 0}/${data.totalRecipients || 0}. Failed ${data.failedCount || 0}.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MP Newsletter</h1>
        <p className="text-[#7E8AA3] text-sm mt-1">Subscriber list, unsubscribe state, and Resend broadcasts for MP updates.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Active subscribers', value: activeSubscribers.length, color: 'text-green-300' },
          { label: 'Unsubscribed', value: inactiveSubscribers.length, color: 'text-[#D6A94A]' },
          { label: 'MPs not subscribed', value: missingMps.length, color: 'text-[#B6C0D1]' },
          { label: 'Campaigns sent', value: campaigns.length, color: 'text-[#F5F7FB]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-[#7E8AA3] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <section className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">Send MP update</h2>
            <p className="text-sm text-[#7E8AA3] mt-1">Use test mode first. Active mode sends one email per active subscriber with their unsubscribe link.</p>
          </div>
          <div className="text-xs text-[#4E5A73] font-mono">Supports raw HTML + attachments</div>
        </div>

        <form onSubmit={send} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs uppercase tracking-wider text-[#7E8AA3] mb-1">Recipient mode</span>
              <select
                name="recipientMode"
                value={recipientMode}
                onChange={event => setRecipientMode(event.target.value as 'test' | 'active')}
                className="w-full bg-[#0B1220] border border-[#25324D] rounded-lg px-3 py-2 text-sm text-[#F5F7FB]"
              >
                <option value="test">Test recipient only</option>
                <option value="active">All active subscribers</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs uppercase tracking-wider text-[#7E8AA3] mb-1">Test recipient</span>
              <input
                name="testEmail"
                type="email"
                placeholder="you@example.com"
                disabled={recipientMode !== 'test'}
                className="w-full bg-[#0B1220] border border-[#25324D] rounded-lg px-3 py-2 text-sm text-[#F5F7FB] disabled:opacity-50"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-[#7E8AA3] mb-1">Subject</span>
            <input name="subject" required className="w-full bg-[#0B1220] border border-[#25324D] rounded-lg px-3 py-2 text-sm text-[#F5F7FB]" />
          </label>

          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-[#7E8AA3] mb-1">Plain text body</span>
            <textarea
              name="textBody"
              required
              rows={8}
              placeholder="Plain-text fallback. You can include {{unsubscribeUrl}} where the unsubscribe link should appear."
              className="w-full bg-[#0B1220] border border-[#25324D] rounded-lg px-3 py-2 text-sm text-[#F5F7FB] font-mono"
            />
          </label>

          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-[#7E8AA3] mb-1">HTML body</span>
            <textarea
              name="htmlBody"
              rows={10}
              placeholder="<h1>Update title</h1><p>Full HTML control. Optional; plain text will be converted if empty. Use {{unsubscribeUrl}} if you want to place the unsubscribe link yourself.</p>"
              className="w-full bg-[#0B1220] border border-[#25324D] rounded-lg px-3 py-2 text-sm text-[#F5F7FB] font-mono"
            />
          </label>

          <label className="block">
            <span className="block text-xs uppercase tracking-wider text-[#7E8AA3] mb-1">Attachments</span>
            <input name="attachments" type="file" multiple className="block w-full text-sm text-[#B6C0D1] file:mr-3 file:rounded-lg file:border-0 file:bg-[#16213A] file:px-3 file:py-2 file:text-[#F5F7FB]" />
            <span className="block text-xs text-[#4E5A73] mt-1">Up to 6 files, 20MB total.</span>
          </label>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="submit"
              disabled={state === 'sending'}
              className="bg-[#2E8B57] hover:bg-[#267548] disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-bold"
            >
              {state === 'sending' ? 'Sending...' : recipientMode === 'test' ? 'Send test' : `Send to ${activeSubscribers.length} subscribers`}
            </button>
            {message && (
              <span className={`text-sm ${state === 'sent' ? 'text-green-300' : 'text-[#F2A7A0]'}`}>{message}</span>
            )}
          </div>
        </form>
      </section>

      <section className="grid xl:grid-cols-2 gap-4">
        <div className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">Subscribers</h2>
            <p className="text-xs text-[#7E8AA3] mt-1">Active and unsubscribed MP update addresses.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Electorate</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(subscriber => (
                  <tr key={subscriber.id} className="border-b border-[#1A2640]">
                    <td className="px-4 py-3 font-mono text-xs text-[#B6C0D1]">{subscriber.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${subscriber.active ? 'bg-green-900/40 text-green-300' : 'bg-[#37291B] text-[#D6A94A]'}`}>
                        {subscriber.active ? 'Subscribed' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#7E8AA3]">{subscriber.electorate ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#4E5A73]">{new Date(subscriber.unsubscribedAt ?? subscriber.subscribedAt).toLocaleDateString('en-AU')}</td>
                  </tr>
                ))}
                {subscribers.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#4E5A73]">No newsletter subscriptions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#25324D]">
            <h2 className="font-bold">MP accounts not subscribed</h2>
            <p className="text-xs text-[#7E8AA3] mt-1">MP-role accounts that are not currently active on the newsletter.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Electorate</th>
                  <th className="text-left px-4 py-3">Access</th>
                </tr>
              </thead>
              <tbody>
                {missingMps.map(mp => (
                  <tr key={mp.email} className="border-b border-[#1A2640]">
                    <td className="px-4 py-3 font-mono text-xs text-[#B6C0D1]">{mp.email}</td>
                    <td className="px-4 py-3 text-xs text-[#7E8AA3]">{mp.electorate ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#4E5A73]">{mp.status}</td>
                  </tr>
                ))}
                {missingMps.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-[#4E5A73]">Every MP account is subscribed</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#25324D]">
          <h2 className="font-bold">Recent sends</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Mode</th>
                <th className="text-left px-4 py-3">Sent</th>
                <th className="text-left px-4 py-3">Failed</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.id} className="border-b border-[#1A2640]">
                  <td className="px-4 py-3 text-[#B6C0D1]">{campaign.subject}</td>
                  <td className="px-4 py-3 text-xs text-[#7E8AA3]">{campaign.recipientMode}</td>
                  <td className="px-4 py-3 text-xs text-green-300">{campaign.sentCount}/{campaign.totalRecipients}</td>
                  <td className="px-4 py-3 text-xs text-[#F2A7A0]">{campaign.failedCount}</td>
                  <td className="px-4 py-3 text-xs text-[#4E5A73]">{new Date(campaign.sentAt ?? campaign.createdAt).toLocaleString('en-AU')}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#4E5A73]">No campaigns sent yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
