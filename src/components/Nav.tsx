import Link from 'next/link';
import { auth } from '@/lib/auth';

export default async function Nav() {
  const session = await auth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">Crossbench</span>
          <span className="hidden sm:inline text-xs text-gray-400 font-normal mt-0.5">Your voice in parliament</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/bills" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            Bills
          </Link>
          <Link href="/electorates" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            Electorates
          </Link>
          {session?.user ? (
            <Link href="/account" className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
              My account
            </Link>
          ) : (
            <Link href="/login" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
