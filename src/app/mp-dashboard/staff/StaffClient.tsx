'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

type StaffData = {
  office: { electorateId: string; name: string; state: string; role: string; canInviteAdmins: boolean };
  memberships: Array<{
    id: string;
    role: string;
    status: string;
    createdAt: string;
    removedAt: string | null;
    blockedAt: string | null;
    canManage: boolean;
    user: { id: string; email: string; name: string | null; emailVerified: string | null };
    invitedBy: { id: string; email: string; name: string | null } | null;
  }>;
  invites: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    expiresAt: string;
    createdAt: string;
    invitedBy: { id: string; email: string; name: string | null };
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    targetEmail: string | null;
    createdAt: string;
    actor: { email: string; name: string | null } | null;
  }>;
};

function roleLabel(role: string) {
  if (role === 'PRINCIPAL') return 'Principal';
  if (role === 'OFFICE_ADMIN') return 'Office admin';
  return 'Staffer';
}

function statusColor(status: string) {
  if (status === 'ACTIVE') return '#2E8B57';
  if (status === 'BLOCKED') return '#D95C4B';
  return '#7E8AA3';
}

export default function StaffClient() {
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('STAFFER');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/mp/staff');
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Failed to load office staff.');
      setLoading(false);
      return;
    }
    setData(body);
    setError(null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setBusy('invite');
    setNotice(null);
    const res = await fetch('/api/mp/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role }),
    });
    const body = await res.json();
    setBusy(null);
    if (!res.ok) {
      setNotice(body.error || 'Could not invite staffer.');
      return;
    }
    setNotice(body.alreadyHadAccount ? 'Staff account added.' : body.emailSent ? 'Invite sent.' : 'Invite created, but email delivery is not configured.');
    setEmail('');
    setName('');
    setRole('STAFFER');
    await load();
  }

  async function staffAction(membershipId: string, action: string, nextRole?: string) {
    setBusy(`${membershipId}:${action}`);
    const res = await fetch(`/api/mp/staff/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role: nextRole }),
    });
    const body = await res.json();
    setBusy(null);
    if (!res.ok) {
      setNotice(body.error || 'Could not update staff account.');
      return;
    }
    await load();
  }

  async function revokeInvite(inviteId: string) {
    setBusy(`invite:${inviteId}`);
    const res = await fetch(`/api/mp/staff/invites/${inviteId}`, { method: 'DELETE' });
    const body = await res.json();
    setBusy(null);
    if (!res.ok) {
      setNotice(body.error || 'Could not revoke invite.');
      return;
    }
    await load();
  }

  return (
    <div className="page-container">
      <Link href="/mp-dashboard" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
        ← MP dashboard
      </Link>

      {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: '#7E8AA3' }}>Loading office staff...</div>}

      {!loading && error && (
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '32px' }}>
          <h1 style={{ fontSize: '22px', margin: '0 0 8px' }}>Office staff</h1>
          <p style={{ color: '#D95C4B', margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && data && (
        <>
          <div style={{ marginBottom: '22px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px' }}>Office staff</h1>
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
              {data.office.name}, {data.office.state} · signed in as {roleLabel(data.office.role)}
            </p>
          </div>

          {notice && (
            <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', color: '#B6C0D1', fontSize: '13px' }}>
              {notice}
            </div>
          )}

          <form onSubmit={invite} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '17px' }}>Invite staffer</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.3fr) minmax(160px, 1fr) 160px auto', gap: '10px', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: '6px', color: '#7E8AA3', fontSize: '12px' }}>
                APH email
                <input value={email} onChange={event => setEmail(event.target.value)} required placeholder="name@aph.gov.au" style={{ backgroundColor: '#0B1220', border: '1px solid #25324D', borderRadius: '8px', padding: '10px 12px', color: '#F5F7FB' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: '#7E8AA3', fontSize: '12px' }}>
                Name
                <input value={name} onChange={event => setName(event.target.value)} placeholder="Optional" style={{ backgroundColor: '#0B1220', border: '1px solid #25324D', borderRadius: '8px', padding: '10px 12px', color: '#F5F7FB' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: '#7E8AA3', fontSize: '12px' }}>
                Role
                <select value={role} onChange={event => setRole(event.target.value)} style={{ backgroundColor: '#0B1220', border: '1px solid #25324D', borderRadius: '8px', padding: '10px 12px', color: '#F5F7FB' }}>
                  <option value="STAFFER">Staffer</option>
                  {data.office.canInviteAdmins && <option value="OFFICE_ADMIN">Office admin</option>}
                </select>
              </label>
              <button disabled={busy === 'invite'} style={{ backgroundColor: '#2E8B57', color: '#fff', border: 0, borderRadius: '8px', padding: '11px 16px', fontWeight: 800, cursor: 'pointer' }}>
                {busy === 'invite' ? 'Sending...' : 'Invite'}
              </button>
            </div>
          </form>

          <section style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #25324D' }}>
              <h2 style={{ margin: 0, fontSize: '17px' }}>Active and managed accounts</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead>
                  <tr style={{ color: '#7E8AA3', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Account</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Invited by</th>
                    <th style={{ padding: '12px 16px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.memberships.map(membership => (
                    <tr key={membership.id} style={{ borderTop: '1px solid #1A2540' }}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ color: '#F5F7FB', fontSize: '13px', fontWeight: 700 }}>{membership.user.name || membership.user.email}</div>
                        <div style={{ color: '#7E8AA3', fontSize: '12px' }}>{membership.user.email}</div>
                      </td>
                      <td style={{ padding: '13px 16px', color: '#B6C0D1', fontSize: '13px' }}>{roleLabel(membership.role)}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ color: statusColor(membership.status), backgroundColor: `${statusColor(membership.status)}22`, padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>{membership.status}</span>
                      </td>
                      <td style={{ padding: '13px 16px', color: '#7E8AA3', fontSize: '12px' }}>{membership.invitedBy?.email || 'Official account'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        {membership.canManage ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {data.office.canInviteAdmins && membership.role !== 'PRINCIPAL' && (
                              <button onClick={() => staffAction(membership.id, 'role', membership.role === 'OFFICE_ADMIN' ? 'STAFFER' : 'OFFICE_ADMIN')} disabled={Boolean(busy)} style={{ backgroundColor: '#16213A', color: '#B6C0D1', border: '1px solid #25324D', borderRadius: '7px', padding: '7px 9px', fontSize: '12px' }}>
                                {membership.role === 'OFFICE_ADMIN' ? 'Make staffer' : 'Make admin'}
                              </button>
                            )}
                            <button onClick={() => staffAction(membership.id, membership.status === 'BLOCKED' ? 'unblock' : 'block')} disabled={Boolean(busy)} style={{ backgroundColor: '#16213A', color: '#B6C0D1', border: '1px solid #25324D', borderRadius: '7px', padding: '7px 9px', fontSize: '12px' }}>
                              {membership.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                            </button>
                            <button onClick={() => staffAction(membership.id, 'remove')} disabled={Boolean(busy)} style={{ backgroundColor: 'rgba(217,92,75,0.12)', color: '#D95C4B', border: '1px solid rgba(217,92,75,0.35)', borderRadius: '7px', padding: '7px 9px', fontSize: '12px' }}>
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#4A5568', fontSize: '12px' }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '18px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: '17px' }}>Pending invites</h2>
              {data.invites.length === 0 ? <p style={{ color: '#7E8AA3', fontSize: '13px', margin: 0 }}>No pending invites.</p> : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {data.invites.map(invite => (
                    <div key={invite.id} style={{ border: '1px solid #25324D', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ color: '#F5F7FB', fontSize: '13px', fontWeight: 700 }}>{invite.name || invite.email}</div>
                      <div style={{ color: '#7E8AA3', fontSize: '12px' }}>{invite.email} · {roleLabel(invite.role)}</div>
                      <div style={{ color: '#4A5568', fontSize: '11px', marginTop: '4px' }}>Expires {new Date(invite.expiresAt).toLocaleDateString()}</div>
                      <button onClick={() => revokeInvite(invite.id)} disabled={Boolean(busy)} style={{ marginTop: '9px', backgroundColor: '#16213A', color: '#B6C0D1', border: '1px solid #25324D', borderRadius: '7px', padding: '7px 9px', fontSize: '12px' }}>Revoke</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '18px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: '17px' }}>Recent activity</h2>
              {data.auditEvents.length === 0 ? <p style={{ color: '#7E8AA3', fontSize: '13px', margin: 0 }}>No staff activity yet.</p> : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {data.auditEvents.map(event => (
                    <div key={event.id} style={{ borderBottom: '1px solid #1A2540', paddingBottom: '10px' }}>
                      <div style={{ color: '#B6C0D1', fontSize: '13px' }}>{event.action.replaceAll('_', ' ')}</div>
                      <div style={{ color: '#7E8AA3', fontSize: '12px' }}>{event.targetEmail || 'Office'} · {new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
