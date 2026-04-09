import { signIn } from '@/lib/auth';
import Link from 'next/link';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return (
    <main className='min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]'>
      <div className='bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full'>
        <Link href='/' className='text-2xl font-bold text-[#F5F7FB] block mb-2'>Crossbench</Link>
        <h1 className='text-2xl font-bold mb-2'>Sign in</h1>
        <p className='text-[#B6C0D1] mb-6'>Enter your email and we&apos;ll send you a sign-in link.</p>
        <form
          action={async (formData: FormData) => {
            'use server';
            await signIn('resend', {
              email: formData.get('email') as string,
              redirectTo: params.next || '/',
            });
          }}
          className='space-y-4'
        >
          <input
            type='email'
            name='email'
            placeholder='your@email.com'
            required
            className='w-full bg-[#16213A] border border-[#25324D] rounded-lg px-4 py-3 text-sm text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]'
          />
          <label className='flex items-start gap-3 cursor-pointer'>
            <input
              type='checkbox'
              name='termsAccepted'
              required
              className='mt-1 w-4 h-4 accent-[#2E8B57] flex-shrink-0'
            />
            <span className='text-xs text-[#B6C0D1] leading-relaxed'>
              I have read and agree to the{' '}
              <Link href='/terms' className='text-[#2E8B57] hover:underline'>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href='/privacy' className='text-[#2E8B57] hover:underline'>
                Privacy Policy
              </Link>
              . I confirm I am providing my own genuine information and will use my account honestly.
            </span>
          </label>
          <button
            type='submit'
            className='w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A]'
          >
            Continue with email
          </button>
        </form>
        <p className='text-xs text-[#7E8AA3] mt-4 text-center'>No password fuss. Just a quick sign-in link.</p>
      </div>
    </main>
  );
}
