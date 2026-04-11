import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";
import Link from "next/link";
import { getBillTags } from "@/lib/bill-tags";

export const revalidate = 300;

export default async function HomePage() {
  const [billCount, voteCount, electorateCount, bills] = await Promise.all([
    prisma.bill.count({ where: { status: 'Before Parliament', parliamentNumber: 48 } }),
    prisma.vote.count(),
    prisma.electorate.count({ where: { mpName: { not: null } } }),
    prisma.bill.findMany({ where: { status: 'Before Parliament', parliamentNumber: 48 }, take: 6, orderBy: { lastUpdatedAt: 'desc' }, include: { _count: { select: { votes: true } } } }),
  ]);

  return (
    <main style={{ backgroundColor: "#0B1220", minHeight: "100vh", color: "#F5F7FB" }}>
      <Nav />
      <section style={{ borderBottom: "1px solid #25324D", padding: "clamp(40px, 8vw, 80px) 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
          <div style={{ maxWidth: "640px" }}>
            <p style={{ color: "#2E8B57", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "20px" }}>Australian civic tech</p>
            <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, lineHeight: 1.1, marginBottom: "20px" }}>Your voice in parliament.</h1>
            <p style={{ fontSize: "18px", color: "#B6C0D1", lineHeight: 1.6, marginBottom: "36px", maxWidth: "520px" }}>Vote on live federal bills and see how people in your electorate are responding. MPs get a live read too.</p>
            <div className="hero-ctas">
              <Link href="/bills" style={{ backgroundColor: "#2E8B57", color: "#fff", padding: "14px 28px", borderRadius: "8px", fontWeight: 600, fontSize: "15px", textDecoration: "none", display: "inline-block" }}>Browse live bills</Link>
              <Link href="/about" style={{ backgroundColor: "transparent", color: "#B6C0D1", padding: "14px 28px", borderRadius: "8px", fontWeight: 500, fontSize: "15px", textDecoration: "none", border: "1px solid #25324D", display: "inline-block" }}>How it works</Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid #25324D", padding: "32px 0" }}>
        <div className="stats-grid" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
          {[{ value: billCount, label: "Bills before parliament" }, { value: voteCount.toLocaleString(), label: "Citizen votes cast" }, { value: electorateCount, label: "Electorates with MPs" }].map(({ value, label }) => (
            <div key={label}><div style={{ fontSize: "clamp(28px, 7vw, 36px)", fontWeight: 700, color: "#D6A94A" }}>{value}</div><div style={{ color: "#7E8AA3", fontSize: "13px", marginTop: "4px" }}>{label}</div></div>
          ))}
        </div>
      </section>

      <section style={{ borderBottom: "1px solid #25324D", padding: "clamp(32px, 5vw, 64px) 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "40px" }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {[
              { step: "01", title: "Read the bill", desc: "Browse bills currently before federal parliament with plain-language context." },
              { step: "02", title: "Vote your view", desc: "Support, oppose, or abstain. One vote per bill, per verified citizen." },
              { step: "03", title: "See your electorate", desc: "Real-time breakdown of how your community and the nation are voting." },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "12px", padding: "28px" }}>
                <div style={{ color: "#2E8B57", fontSize: "13px", fontWeight: 700, marginBottom: "12px", letterSpacing: "0.05em" }}>{step}</div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>{title}</h3>
                <p style={{ color: "#B6C0D1", fontSize: "14px", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "clamp(32px, 5vw, 64px) 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700 }}>Currently before parliament</h2>
            <Link href="/bills" style={{ color: "#2E8B57", fontSize: "14px", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gap: "12px" }}>
            {bills.length === 0 ? (
              <div style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "12px", padding: "48px", textAlign: "center", color: "#7E8AA3" }}>No live bills right now. Check back soon.</div>
            ) : bills.map(bill => {
              const tags = getBillTags(bill);
              return (
                <Link key={bill.id} href={`/bills/${bill.id}`} style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "12px", padding: "20px 24px", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      {tags.map(tag => (
                        <span key={tag.label} style={{ backgroundColor: tag.bg, color: tag.color, fontSize: "11px", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          {tag.pulse && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: tag.color, display: "inline-block", flexShrink: 0 }} />}
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <p style={{ color: "#F5F7FB", fontWeight: 500, fontSize: "15px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bill.title}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#D6A94A" }}>{bill._count.votes}</div>
                    <div style={{ fontSize: "11px", color: "#7E8AA3" }}>votes</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ borderTop: "1px solid #25324D", padding: "32px 0", backgroundColor: "#111A2E" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px", display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "center" }}>
          {["Nonpartisan by design", "Privacy-first participation", "Electorate-level, not identity-level", "Independent — not government-run"].map(item => (
            <span key={item} style={{ color: "#7E8AA3", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ color: "#2E8B57" }}>✓</span> {item}</span>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #25324D", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "#7E8AA3", fontSize: "13px", margin: 0 }}>Crossbench is independent and nonpartisan. Not affiliated with the Australian Government or any political party. · <Link href="/privacy" style={{ color: "#7E8AA3", textDecoration: "underline" }}>Privacy policy</Link></p>
      </footer>
    </main>
  );
}
