import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminVotes({ searchParams }: { searchParams: Promise<{ comments?: string }> }) {
  const params = await searchParams;
  const commentsOnly = params.comments === '1';

  const votes = await prisma.vote.findMany({
    where: commentsOnly ? { comment: { not: null } } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { include: { electorate: true } },
      bill: { select: { id: true, title: true } },
    },
  });

  const withComments = votes.filter(v => v.comment).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Votes & Comments</h1>
          <p className="text-[#7E8AA3] text-sm mt-1">{votes.length} votes · {withComments} with comments</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/votes" className="px-3 py-2 rounded-lg text-sm bg-[#16213A] border border-[#25324D] text-[#B6C0D1] hover:text-[#F5F7FB] transition-colors">
            All votes
          </a>
          <a href="/admin/votes?comments=1" className="px-3 py-2 rounded-lg text-sm bg-[#16213A] border border-[#25324D] text-[#B6C0D1] hover:text-[#F5F7FB] transition-colors">
            Comments only
          </a>
        </div>
      </div>

      <div className="space-y-3">
        {votes.map(v => (
          <div key={v.id} className="bg-[#111A2E] border border-[#25324D] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    v.position === 'SUPPORT' ? 'bg-green-900/40 text-green-300' :
                    v.position === 'OPPOSE' ? 'bg-red-900/40 text-red-300' :
                    'bg-yellow-900/40 text-yellow-300'
                  }`}>{v.position}</span>
                  <span className="text-xs text-[#7E8AA3]">{v.user.electorate?.name ?? 'unverified'}</span>
                  <span className="text-xs text-[#4E5A73]">{v.user.email}</span>
                </div>
                <div className="text-xs text-[#B6C0D1] line-clamp-2">
                  <a href={`/bills/${v.bill.id}`} target="_blank" className="hover:text-[#2E8B57]">
                    {v.bill.title}
                  </a>
                </div>
                {v.comment && (
                  <div className="mt-2 text-sm text-[#F5F7FB] bg-[#16213A] rounded-lg px-3 py-2 border-l-2 border-[#2E8B57]">
                    "{v.comment}"
                  </div>
                )}
              </div>
              <div className="text-xs text-[#4E5A73] whitespace-nowrap">
                {new Date(v.createdAt).toLocaleDateString()}<br/>
                {new Date(v.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {votes.length === 0 && (
          <div className="text-center text-[#4E5A73] py-12">No votes yet</div>
        )}
      </div>
    </div>
  );
}
