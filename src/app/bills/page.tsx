import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";
import Link from "next/link";
import { getBillTags } from "@/lib/bill-tags";

export const revalidate = 300;

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ q?: string; chamber?: string; page?: string }> }) {
  const { q, chamber, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 20;
  const where = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { sponsorName: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(chamber ? { chamber: chamber as any } : {}),
  };
  const [bills, total] = await Promise.all([
    prisma.bill.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { lastUpdatedAt: "desc" }, include: { _count: { select: { votes: true } } } }),
    prisma.bill.count({ where }),
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <main style={{ backgroundColor: "#0B1220", minHeight: "100vh", color: "#F5F7FB" }}>
      <Nav />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px" }}>Bills before parliament</h1>

        <form style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "10px", padding: "16px", marginBottom: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input name="q" defaultValue={q} placeholder="Search bills..." style={{ flex: 1, minWidth: "200px", backgroundColor: "#16213A", border: "1px solid #25324D", borderRadius: "6px", padding: "10px 14px", color: "#F5F7FB", fontSize: "14px" }} />
          <select name="chamber" defaultValue={chamber} style={{ backgroundColor: "#16213A", border: "1px solid #25324D", borderRadius: "6px", padding: "10px 14px", color: "#F5F7FB", fontSize: "14px" }}>
            <option value="">All chambers</option>
            <option value="HOUSE">House of Reps</option>
            <option value="SENATE">Senate</option>
            <option value="JOINT">Joint</option>
          </select>
          <button type="submit" style={{ backgroundColor: "#2E8B57", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Search</button>
        </form>

        <p style={{ color: "#7E8AA3", fontSize: "13px", marginBottom: "16px" }}>{total} bills</p>

        <div style={{ display: "grid", gap: "8px" }}>
          {bills.length === 0 ? (
            <div style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "10px", padding: "48px", textAlign: "center", color: "#7E8AA3" }}>
              No bills match your search.
            </div>
          ) : bills.map(bill => {
            const tags = getBillTags(bill);
            return (
              <Link key={bill.id} href={`/bills/${bill.id}`} style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "10px", padding: "16px 20px", textDecoration: "none", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {tags.map(tag => (
                      <span key={tag.label} style={{ backgroundColor: tag.bg, color: tag.color, fontSize: "11px", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        {tag.pulse && (
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: tag.color, display: "inline-block", flexShrink: 0 }} />
                        )}
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <p style={{ color: "#F5F7FB", fontWeight: 500, margin: 0, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bill.title}</p>
                  {bill.sponsorName && <p style={{ color: "#7E8AA3", fontSize: "12px", margin: "4px 0 0" }}>{bill.sponsorName}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#D6A94A" }}>{bill._count.votes}</div>
                  <div style={{ fontSize: "11px", color: "#7E8AA3" }}>votes</div>
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
            {page > 1 && <Link href={`/bills?page=${page - 1}${q ? `&q=${q}` : ""}`} style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "6px", padding: "8px 16px", color: "#B6C0D1", textDecoration: "none", fontSize: "14px" }}>← Prev</Link>}
            <span style={{ padding: "8px 16px", color: "#7E8AA3", fontSize: "14px" }}>Page {page} of {totalPages}</span>
            {page < totalPages && <Link href={`/bills?page=${page + 1}${q ? `&q=${q}` : ""}`} style={{ backgroundColor: "#111A2E", border: "1px solid #25324D", borderRadius: "6px", padding: "8px 16px", color: "#B6C0D1", textDecoration: "none", fontSize: "14px" }}>Next →</Link>}
          </div>
        )}
      </div>
    </main>
  );
}
