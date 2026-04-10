import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash } from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const COOKIE_SECRET = process.env.MISSION_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';

function makeToken(password: string): string {
  return createHash('sha256').update(password + COOKIE_SECRET).digest('hex');
}

async function isAuthenticated(): Promise<boolean> {
  if (!ADMIN_PASSWORD) return false;
  const jar = await cookies();
  const token = jar.get('admin_session')?.value;
  if (!token) return false;
  return token === makeToken(ADMIN_PASSWORD);
}

const NAV = [
  { href: '/admin', label: '📊 Overview' },
  { href: '/admin/users', label: '👥 Users' },
  { href: '/admin/mps', label: '🏛️ MPs' },
  { href: '/admin/bills', label: '📋 Bills' },
  { href: '/admin/votes', label: '🗳️ Votes & Comments' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin-login");

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F5F7FB] flex">
      <aside className="w-56 border-r border-[#25324D] flex-shrink-0 flex flex-col">
        <div className="px-5 py-5 border-b border-[#25324D]">
          <Link href="/" className="text-lg font-bold text-[#F5F7FB]">Crossbench</Link>
          <div className="text-xs text-[#4E5A73] mt-1 font-mono">ADMIN</div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-lg text-sm text-[#B6C0D1] hover:bg-[#16213A] hover:text-[#F5F7FB] transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <form action="/api/admin/login" method="POST" className="px-5 py-4 border-t border-[#25324D]">
          <Link href="/api/admin/logout" className="text-xs text-[#4E5A73] hover:text-[#B6C0D1]">Sign out</Link>
        </form>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
