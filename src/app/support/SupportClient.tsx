'use client';

import { useState, useRef, useEffect } from 'react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type View = 'chat' | 'ticket' | 'done';

export default function SupportClient() {
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm the Crossbench support assistant. What can I help you with today?" }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Ticket form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendChat() {
    const q = input.trim();
    if (!q || chatLoading) return;
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply || "Sorry, I couldn't process that. Please try again or submit a ticket." }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Something went wrong. Please try submitting a support ticket instead." }]);
    }
    setChatLoading(false);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      setView('done');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', backgroundColor: '#16213A', border: '1px solid #25324D',
    borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#F5F7FB',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ flex: 1, maxWidth: '680px', margin: '0 auto', padding: '40px 16px', width: '100%' }}>
      <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>Support</h1>
      <p style={{ color: '#7E8AA3', margin: '0 0 28px', fontSize: '14px' }}>Ask our AI assistant or submit a ticket and we'll get back to you.</p>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['chat', 'ticket'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
            borderColor: view === v ? '#2E8B57' : '#25324D',
            backgroundColor: view === v ? 'rgba(46,139,87,0.15)' : '#111A2E',
            color: view === v ? '#2E8B57' : '#7E8AA3',
          }}>
            {v === 'chat' ? '💬 AI Assistant' : '🎫 Submit a Ticket'}
          </button>
        ))}
      </div>

      {/* AI Chat */}
      {view === 'chat' && (
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ height: '380px', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  backgroundColor: m.role === 'user' ? '#2E8B57' : '#1A2540',
                  color: '#F5F7FB', fontSize: '14px', lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#1A2540', padding: '10px 16px', borderRadius: '12px 12px 12px 2px', color: '#7E8AA3', fontSize: '13px' }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {/* Input */}
          <div style={{ borderTop: '1px solid #25324D', padding: '14px 16px', display: 'flex', gap: '10px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder="Ask a question…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={sendChat} disabled={chatLoading || !input.trim()} style={{
              backgroundColor: '#2E8B57', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '10px 18px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              opacity: chatLoading || !input.trim() ? 0.5 : 1,
            }}>Send</button>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1A2540' }}>
            <button onClick={() => setView('ticket')} style={{ fontSize: '12px', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer' }}>
              Still need help? Submit a support ticket →
            </button>
          </div>
        </div>
      )}

      {/* Ticket form */}
      {view === 'ticket' && (
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
          <form onSubmit={submitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#7E8AA3', display: 'block', marginBottom: '6px' }}>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#7E8AA3', display: 'block', marginBottom: '6px' }}>Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#7E8AA3', display: 'block', marginBottom: '6px' }}>Subject *</label>
              <input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's the issue?" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#7E8AA3', display: 'block', marginBottom: '6px' }}>Message *</label>
              <textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in as much detail as possible…" rows={5}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            {error && <p style={{ color: '#D95C4B', fontSize: '13px', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={submitting} style={{
              backgroundColor: '#2E8B57', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </form>
        </div>
      )}

      {/* Done */}
      {view === 'done' && (
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #2E8B57', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Ticket submitted</h2>
          <p style={{ color: '#7E8AA3', margin: '0 0 20px', fontSize: '14px' }}>We've received your message and will get back to you as soon as possible.</p>
          <button onClick={() => { setView('chat'); setSubject(''); setMessage(''); setEmail(''); setName(''); }} style={{
            backgroundColor: '#111A2E', color: '#7E8AA3', border: '1px solid #25324D',
            borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer',
          }}>Back to support</button>
        </div>
      )}
    </div>
  );
}
