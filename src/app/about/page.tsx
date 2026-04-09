import Nav from '@/components/Nav';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>About Crossbench</h1>
        <p style={{ color: '#B6C0D1', fontSize: '16px', lineHeight: 1.7, marginBottom: '48px' }}>Crossbench is a civic tech platform that lets Australians vote on live federal legislation and see how their electorate is responding in real time. It is built to make public input easier to give, easier to read, and harder to ignore.</p>
        {[
          { q: 'Is it affiliated with the government?', a: 'No. Crossbench is not run by the government or any political party. It is an independent platform.' },
          { q: 'How does electorate verification work?', a: 'We use your address to match you to an electorate. Once that match is made, we keep the electorate, not the address itself.' },
          { q: 'Is my vote anonymous?', a: 'Your vote is shown as part of the electorate result. We do not publish your name next to your vote.' },
          { q: 'What happens to my data?', a: 'We collect only what we need: your email, your electorate, and the votes you cast. We do not store your address after verification.' },
          { q: 'Can MPs actually see this?', a: 'Yes. MPs and their staff can view electorate-level results on the dashboard. They see how people in their electorate are voting on live bills.' },
          { q: 'Why should I bother?', a: 'Because most people only hear about a bill after the decision is close to done. Crossbench gives you a way to weigh in earlier, in plain English, while your vote can still be part of the conversation.' },
        ].map(({ q, a }) => (<div key={q} style={{ marginBottom: '32px', borderBottom: '1px solid #25324D', paddingBottom: '32px' }}><h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#F5F7FB' }}>{q}</h2><p style={{ color: '#B6C0D1', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>{a}</p></div>))}
        <Link href="/bills" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }}>Browse live bills →</Link>
      </div>
    </main>
  );
}
