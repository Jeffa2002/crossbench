import { signIn } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className='min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]'>
      <div className='bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full'>
        <Link href='/' className='text-2xl font-bold text-[#F5F7FB] block mb-2'>Crossbench</Link>
        <h1 className='text-2xl font-bold mb-2'>Sign in</h1>
        <p className='text-[#B6C0D1] mb-6'>Enter your email and we'll send you a sign-in link.</p>
        <form action={async (formData: FormData) => { 'use server'; await signIn('resend', { email: formData.get('email') as string, redirectTo: (searchParams.next as string) || '/' }); }} className='space-y-4'>
          <input type='email' name='email' placeholder='your@email.com' required className='w-full bg-[#16213A] border border-[#25324D] rounded-lg px-4 py-3 text-sm text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]' />
          <button type='submit' className='w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A]'>Continue with email</button>
        </form>
        <p className='text-xs text-[#7E8AA3] mt-4 text-center'>No password fuss. Just a quick sign-in link.</p>
      </div>
    </main>
  );
}
