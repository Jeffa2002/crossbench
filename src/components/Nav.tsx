import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Nav() {
  const session = await auth();
  return (
    <header style={{ backgroundColor: "#0B1220", borderBottom: "1px solid #25324D", position: "sticky", top: 0, zIndex: 50 }}>
      <div className="nav-inner">
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#F5F7FB" }}>Crossbench</span>
          <span style={{ fontSize: "11px", color: "#7E8AA3", fontWeight: 400 }}>AU</span>
        </Link>
        <nav className="nav-links">
          <Link href="/bills" className="nav-link">Bills</Link>
          <Link href="/stats" className="nav-link nav-link-hide-xs">Stats</Link>
          <Link href="/parliament" className="nav-link nav-link-hide-xs">Parliament</Link>
          <Link href="/electorates" className="nav-link nav-link-hide-xs">Electorates</Link>
          <Link href="/about" className="nav-link nav-link-hide-xs">About</Link>
          {session?.user ? (
            <>
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <Link href="/account" className="nav-cta">Account</Link>
            </>
          ) : (
            <Link href="/login" className="nav-cta">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
