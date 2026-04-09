"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, redirect: false });
    setSent(true);
    setLoading(false);
  }
  if (sent) return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center"><div className="text-4xl mb-4">📬</div><h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1><p className="text-gray-500">We sent a sign-in link to <strong>{email}</strong></p></div></main>;
  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full"><Link href="/" className="text-2xl font-bold text-gray-900 block mb-2">Crossbench</Link><p className="text-gray-500 mb-6">Sign in to vote on bills and make your voice heard</p><form onSubmit={handleSubmit} className="space-y-4"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? "Sending..." : "Send sign-in link"}</button></form><p className="text-xs text-gray-400 mt-4 text-center">No password needed. We'll email you a secure link.</p></div></main>;
}
