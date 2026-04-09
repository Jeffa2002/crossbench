import { signIn } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <main className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full'>
        <Link href='/' className='text-2xl font-bold text-gray-900 block mb-2'>
          Crossbench
        </Link>
        <p className='text-gray-500 mb-6'>
          Sign in to vote on bills and make your voice heard
        </p>
        <form
          action={async (formData: FormData) => {
            'use server';
            await signIn('resend', {
              email: formData.get('email') as string,
              redirectTo: (searchParams.next as string) || '/',
            });
          }}
          className='space-y-4'
        >
          <input
            type='email'
            name='email'
            placeholder='your@email.com'
            required
            className='w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button
            type='submit'
            className='w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700'
          >
            Send sign-in link
          </button>
        </form>
        <p className='text-xs text-gray-400 mt-4 text-center'>
          No password needed. We&apos;ll email you a secure link.
        </p>
      </div>
    </main>
  );
}
