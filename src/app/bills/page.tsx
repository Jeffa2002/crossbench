import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";
import Link from "next/link";
import { getBillTags } from "@/lib/bill-tags";

export const revalidate = 300;

const STATUS_TABS = [
  { label: "Before Parliament", value: "Before Parliament", emoji: "🏛️" },
  { label: "Passed", value: "Passed", emoji: "✅" },
  { label: "Not Passed", value: "Not Passed", emoji: "❌" },
];

const OUTCOME_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  Passed: { label: "✅ Passed", bg: "rgba(46,139,87,0.2)", color: "#2E8B57" },
  "Not Passed": { label: "❌ Not Passed", bg: "rgba(185,28,28,0.15)", color: "#f87171" },
  "Before Parliament": { label: "🏛️ Active", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  "Lapsed": { label: "⏹ Lapsed", bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
};

function getBadgeForBill(bill: any) {
  if (bill.status === "Before Parliament" && bill.parliamentNumber && bill.parliamentNumber < 48) {
    return OUTCOME_BADGE["Lapsed"];
  }
  return (bill.outcome ? OUTCOME_BADGE[bill.outcome] : null) ?? OUTCOME_BADGE[bill.status];
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chamber?: string; page?: string; status?: string }>;
}) {
  const { q, chamber, page: pageStr, status } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 20;

  // Default to "Before Parliament" unless explicitly set
  const activeStatus = status ?? "Before Parliament";

  const where = {
    status: activeStatus === "all" ? undefined : activeStatus,
    // Only show current parliament (48) when filtering by Before Parliament
    ...(activeStatus === "Before Parliament" ? { parliamentNumber: 48 } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { sponsorName: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(chamber ? { chamber: chamber as any } : {}),
  };

  const [bills, total, counts] = await Promise.all([
    prisma.bill.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: activeStatus === "all" ? [{ status: "asc" }, { lastUpdatedAt: "desc" }] : { lastUpdatedAt: "desc" },
      include: { _count: { select: { votes: true } } },
    }),
    prisma.bill.count({ where }),
    // Count active bills (parl 48 only for Before Parliament)
    Promise.all([
      prisma.bill.count({ where: { status: "Before Parliament", parliamentNumber: 48 } }),
      prisma.bill.count({ where: { status: "Passed" } }),
      prisma.bill.count({ where: { status: "Not Passed" } }),
      prisma.bill.count(),
    ]),
  ]);

  const totalPages = Math.ceil(total / limit);
  const [activeCt, passedCt, notPassedCt, allCt] = counts;
  const countMap: Record<string, number> = { "Before Parliament": activeCt, "Passed": passedCt, "Not Passed": notPassedCt, "all": allCt };

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    params.set("status", activeStatus);
    if (q) params.set("q", q);
    if (chamber) params.set("chamber", chamber);
    if (p > 1) params.set("page", String(p));
    return `/bills?${params.toString()}`;
  }

  const pageTitle =
    activeStatus === "Before Parliament"
      ? "Bills before parliament"
      : activeStatus === "Passed"
      ? "Bills that passed"
      : activeStatus === "Not Passed"
      ? "Bills that didn't pass"
      : "All bills";

  return (
    <main style={{ backgroundColor: "#0B1220", minHeight: "100vh", color: "#F5F7FB" }}>
      <Nav />
      <div className="page-container-wide">
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "20px" }}>{pageTitle}</h1>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => {
            const active = activeStatus === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/bills?status=${encodeURIComponent(tab.value)}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  border: `1px solid ${active ? "#2E8B57" : "#25324D"}`,
                  backgroundColor: active ? "rgba(46,139,87,0.15)" : "#111A2E",
                  color: active ? "#2E8B57" : "#B6C0D1",
                }}
              >
                {tab.emoji} {tab.label}
                {countMap[tab.value] !== undefined && (
                  <span style={{ marginLeft: "6px", opacity: 0.7, fontWeight: 400 }}>
                    ({countMap[tab.value]})
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Search/filter */}
        <form
          className="search-form"
          style={{
            backgroundColor: "#111A2E",
            border: "1px solid #25324D",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <input type="hidden" name="status" value={activeStatus} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search bills..."
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: "#16213A",
              border: "1px solid #25324D",
              borderRadius: "6px",
              padding: "10px 14px",
              color: "#F5F7FB",
              fontSize: "14px",
            }}
          />
          <select
            name="chamber"
            defaultValue={chamber}
            style={{
              backgroundColor: "#16213A",
              border: "1px solid #25324D",
              borderRadius: "6px",
              padding: "10px 14px",
              color: "#F5F7FB",
              fontSize: "14px",
            }}
          >
            <option value="">All chambers</option>
            <option value="HOUSE">House of Reps</option>
            <option value="SENATE">Senate</option>
            <option value="JOINT">Joint</option>
          </select>
          <button
            type="submit"
            style={{
              backgroundColor: "#2E8B57",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>

        <p style={{ color: "#7E8AA3", fontSize: "13px", marginBottom: "16px" }}>{total} bills</p>

        {/* Bill list */}
        <div style={{ display: "grid", gap: "8px" }}>
          {bills.length === 0 ? (
            <div
              style={{
                backgroundColor: "#111A2E",
                border: "1px solid #25324D",
                borderRadius: "10px",
                padding: "48px",
                textAlign: "center",
                color: "#7E8AA3",
              }}
            >
              No bills match your search.
            </div>
          ) : (
            bills.map((bill) => {
              const tags = getBillTags(bill);
              const outcomeBadge = getBadgeForBill(bill);
              const isLapsed = bill.status === "Before Parliament" && (bill as any).parliamentNumber && (bill as any).parliamentNumber < 48;
              const isClosed = bill.status !== "Before Parliament" || isLapsed;

              return (
                <Link
                  key={bill.id}
                  href={`/bills/${bill.id}`}
                  style={{
                    backgroundColor: "#111A2E",
                    border: `1px solid ${isClosed ? "rgba(37,50,77,0.6)" : "#25324D"}`,
                    borderRadius: "10px",
                    padding: "16px 20px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    opacity: isClosed ? 0.85 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {/* Outcome badge */}
                      {outcomeBadge && (
                        <span
                          style={{
                            backgroundColor: outcomeBadge.bg,
                            color: outcomeBadge.color,
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          {outcomeBadge.label}
                        </span>
                      )}
                      {tags.map((tag) => (
                        <span
                          key={tag.label}
                          style={{
                            backgroundColor: tag.bg,
                            color: tag.color,
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          {tag.pulse && (
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: tag.color,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        color: "#F5F7FB",
                        fontWeight: 500,
                        margin: 0,
                        fontSize: "14px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bill.title}
                    </p>
                    {bill.sponsorName && (
                      <p style={{ color: "#7E8AA3", fontSize: "12px", margin: "4px 0 0" }}>
                        {bill.sponsorName}
                      </p>
                    )}
                    {isClosed && bill._count.votes > 0 && (
                      <p style={{ color: "#7E8AA3", fontSize: "11px", margin: "4px 0 0" }}>
                        {bill._count.votes} constituent votes recorded
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: isClosed ? "#7E8AA3" : "#D6A94A" }}>
                      {bill._count.votes}
                    </div>
                    <div style={{ fontSize: "11px", color: "#7E8AA3" }}>votes</div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                style={{
                  backgroundColor: "#111A2E",
                  border: "1px solid #25324D",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  color: "#B6C0D1",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                ← Prev
              </Link>
            )}
            <span style={{ padding: "8px 16px", color: "#7E8AA3", fontSize: "14px" }}>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                style={{
                  backgroundColor: "#111A2E",
                  border: "1px solid #25324D",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  color: "#B6C0D1",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
