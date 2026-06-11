import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ADDRESS_VERIFICATION_STATUSES, addressVerifiedUserWhere, isAddressVerified } from '@/lib/verification';

export const dynamic = 'force-dynamic';

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string; verified?: string; q?: string }> }) {
  const params = await searchParams;
  const { role, verified, q } = params;

  const where: any = {};
  if (role) where.role = role;
  if (verified === '1') Object.assign(where, addressVerifiedUserWhere);
  if (verified === '0') {
    where.OR = [
      { verifiedAt: null },
      { electorateId: null },
      { electorateVerified: false },
      { verificationStatus: { notIn: ADDRESS_VERIFICATION_STATUSES } },
    ];
  }
  if (q) where.email = { contains: q, mode: 'insensitive' };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      electorate: true,
      _count: { select: { votes: true } },
    },
  });

  function isOfficialMpLink(user: (typeof users)[number]) {
    return Boolean(
      user.role === 'MP' &&
      user.electorateId &&
      user.electorate?.mpEmail &&
      user.electorate.mpEmail.toLowerCase() === user.email.toLowerCase()
    );
  }

  function verificationBadge(user: (typeof users)[number]) {
    if (isAddressVerified(user)) {
      return { label: `Address verified · ${new Date(user.verifiedAt!).toLocaleDateString()}`, className: 'bg-green-900/40 text-green-300' };
    }
    if (isOfficialMpLink(user)) {
      return { label: 'MP office linked', className: 'bg-purple-900/40 text-purple-300' };
    }
    if (user.electorateId) {
      return { label: 'Linked, not address verified', className: 'bg-amber-900/40 text-amber-300' };
    }
    return { label: 'Email only', className: 'bg-[#16213A] text-[#7E8AA3]' };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-[#7E8AA3] text-sm mt-1">{users.length} results</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email…"
            className="bg-[#16213A] border border-[#25324D] rounded-lg px-3 py-2 text-sm text-[#F5F7FB] focus:outline-none focus:ring-1 focus:ring-[#2E8B57]"
          />
          <button type="submit" className="bg-[#2E8B57] text-white px-4 py-2 rounded-lg text-sm">Search</button>
        </form>
        <div className="flex gap-2">
          {[
            { label: 'All', href: '/admin/users' },
            { label: 'Citizens', href: '/admin/users?role=CITIZEN' },
            { label: 'MPs', href: '/admin/users?role=MP' },
            { label: 'Verified', href: '/admin/users?verified=1' },
            { label: 'Unverified', href: '/admin/users?verified=0' },
          ].map(({ label, href }) => (
            <Link key={label} href={href} className="px-3 py-2 rounded-lg text-sm bg-[#16213A] border border-[#25324D] text-[#B6C0D1] hover:text-[#F5F7FB] hover:border-[#2E8B57] transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111A2E] border border-[#25324D] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#25324D] text-[#7E8AA3] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Electorate</th>
              <th className="text-left px-4 py-3">Verification</th>
              <th className="text-left px-4 py-3">Votes</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Sub</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const badge = verificationBadge(u);
              const addressVerified = isAddressVerified(u);
              const officialMpLink = isOfficialMpLink(u);
              return (
              <tr key={u.id} className="border-b border-[#1A2640] hover:bg-[#16213A] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[#B6C0D1]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'MP' ? 'bg-purple-900/40 text-purple-300' : 'bg-[#16213A] text-[#7E8AA3]'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.electorate ? (
                    <div>
                      <span className={addressVerified ? 'text-[#B6C0D1]' : officialMpLink ? 'text-purple-300' : 'text-amber-300'}>
                        {u.electorate.name}
                      </span>
                      {!addressVerified && (
                        <div className="text-[10px] text-[#4E5A73] mt-0.5">
                          {officialMpLink ? 'office link' : 'not residentially verified'}
                        </div>
                      )}
                    </div>
                  ) : <span className="text-[#4E5A73]">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[#B6C0D1]">{u._count.votes}</td>
                <td className="px-4 py-3 text-xs text-[#4E5A73]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.subscriptionStatus === 'ACTIVE' ? 'bg-green-900/40 text-green-300' :
                    u.subscriptionStatus === 'TRIAL' ? 'bg-blue-900/40 text-blue-300' :
                    'bg-[#16213A] text-[#7E8AA3]'
                  }`}>{u.subscriptionStatus}</span>
                </td>
              </tr>
            );})}
            {users.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#4E5A73]">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
