import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <main className='min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]'>
      <div className='bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full text-center'>
        <div className='text-4xl mb-4'>📬</div>
        <h1 className='text-xl font-bold mb-2'>Check your email</h1>
        <p className='text-[#B6C0D1] mb-6'>We sent a sign-in link to your email address. Click it to sign in — it expires in 10 minutes.</p>
        <Link href='/' className='text-[#2E8B57] hover:underline text-sm'>← Back to home</Link>
      </div>
    </main>
  );
}
