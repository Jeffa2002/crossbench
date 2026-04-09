import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <main className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center'>
        <div className='text-4xl mb-4'>📬</div>
        <h1 className='text-xl font-bold text-gray-900 mb-2'>Check your email</h1>
        <p className='text-gray-500 mb-6'>
          We sent a sign-in link to your email address. Click it to sign in — it
          expires in 10 minutes.
        </p>
        <Link href='/' className='text-blue-600 hover:underline text-sm'>
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
