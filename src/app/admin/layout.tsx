import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasAdminSessionCookie } from '@/lib/admin-auth';

const NAV = [
  { href: '/admin', label: '📊 Overview' },
  { href: '/admin/users', label: '👥 Users' },
  { href: '/admin/mps', label: '🏛️ MPs' },
  { href: '/admin/bills', label: '📋 Bills' },
  { href: '/admin/support', label: '🎫 Support' },
  { href: '/admin/votes', label: '🗳️ Votes & Comments' },
  { href: '/admin/marketing', label: '📈 Marketing Strategy' },
  { href: '/admin/media', label: '📰 Media Outreach' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await hasAdminSessionCookie();
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
