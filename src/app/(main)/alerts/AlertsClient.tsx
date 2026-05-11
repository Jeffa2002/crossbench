'use client';

import { useState } from 'react';

interface BillAlert {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: Date | string;
  lastNotifiedAt: Date | string | null;
  _count: { notifications: number };
}

export default function AlertsClient({ initialAlerts }: { initialAlerts: BillAlert[] }) {
  const [alerts, setAlerts] = useState<BillAlert[]>(initialAlerts);
  const [newKeyword, setNewKeyword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newKeyword.trim().length < 2) {
      setError('Keyword must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Alert created for "${newKeyword}"`);
        setNewKeyword('');
        // Refresh alerts
        const refreshRes = await fetch('/api/alerts');
        if (refreshRes.ok) {
          setAlerts(await refreshRes.json());
        }
      } else {
        setError(data.error || 'Failed to create alert');
      }
    } catch {
      setError('Failed to create alert');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAlert(id: string, isActive: boolean) {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      // Refresh
      const res = await fetch('/api/alerts');
      if (res.ok) setAlerts(await res.json());
    } catch {
      setError('Failed to update alert');
    }
  }

  async function deleteAlert(id: string) {
    if (!confirm('Delete this alert?')) return;
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch {
      setError('Failed to delete alert');
    }
  }

  return (
    <div>
      {/* Create form */}
      <form onSubmit={createAlert} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Enter keyword (e.g., climate, housing, health)"
            maxLength={100}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: '#111A2E',
              border: '1px solid #25324D',
              borderRadius: '8px',
              color: '#F5F7FB',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Adding...' : 'Add Alert'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#EF4444',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          color: '#22C55E',
          fontSize: '14px',
        }}>
          {success}
        </div>
      )}

      {/* Alerts list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#7E8AA3',
          }}>
            <p style={{ marginBottom: '8px' }}>No alerts yet</p>
            <p style={{ fontSize: '13px' }}>
              Add a keyword above to get notified when matching bills are introduced.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: '#111A2E',
                border: '1px solid #25324D',
                borderRadius: '10px',
                opacity: alert.isActive ? 1 : 0.6,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 500, color: '#F5F7FB' }}>
                    {alert.keyword}
                  </span>
                  {!alert.isActive && (
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: '#374151',
                      color: '#9CA3AF',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}>
                      Paused
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#7E8AA3', marginTop: '4px' }}>
                  {alert._count.notifications} matches
                  {alert.lastNotifiedAt && (
                    <> · Last: {new Date(alert.lastNotifiedAt).toLocaleDateString()}</>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleAlert(alert.id, alert.isActive)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    backgroundColor: alert.isActive ? '#1F2937' : 'rgba(59, 130, 246, 0.15)',
                    color: alert.isActive ? '#9CA3AF' : '#60A5FA',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {alert.isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <p style={{ marginTop: '20px', fontSize: '13px', color: '#6B7280' }}>
          Alerts are checked daily at 10am AWST. Maximum 10 alerts per user.
        </p>
      )}
    </div>
  );
}
