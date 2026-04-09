import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Nav() {
  const session = await auth();
  return (
    <header style={{ backgroundColor: "#0B1220", borderBottom: "1px solid #25324D", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#F5F7FB" }}>Crossbench</span>
          <span style={{ fontSize: "11px", color: "#7E8AA3", fontWeight: 400 }}>AU</span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Link href="/bills" style={{ color: "#B6C0D1", fontSize: "14px", padding: "8px 12px", borderRadius: "6px", textDecoration: "none" }}>Bills</Link>
          <Link href="/electorates" style={{ color: "#B6C0D1", fontSize: "14px", padding: "8px 12px", borderRadius: "6px", textDecoration: "none" }}>Electorates</Link>
          <Link href="/about" style={{ color: "#B6C0D1", fontSize: "14px", padding: "8px 12px", borderRadius: "6px", textDecoration: "none" }}>About</Link>
          {session?.user ? (
            <Link href="/account" style={{ backgroundColor: "#2E8B57", color: "#fff", fontSize: "13px", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}>My account</Link>
          ) : (
            <Link href="/login" style={{ backgroundColor: "#2E8B57", color: "#fff", fontSize: "13px", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
