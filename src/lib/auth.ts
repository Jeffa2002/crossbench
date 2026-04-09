import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Resend from 'next-auth/providers/resend';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Resend({
      from: 'Crossbench <onboarding@resend.dev>',
      apiKey: process.env.RESEND_API_KEY,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      (session.user as any).id = user.id;
      (session.user as any).role = (user as any).role;
      (session.user as any).electorateId = (user as any).electorateId;
      (session.user as any).verifiedAt = (user as any).verifiedAt;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-email',
  },
});
