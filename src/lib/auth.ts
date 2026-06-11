import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Resend from 'next-auth/providers/resend';
import { prisma } from './prisma';
import { ensurePrincipalOfficeMembership, isAphEmail } from './mp-office';

async function grantMpEarlyAccess(user: { id?: string | null; email?: string | null; electorateId?: string | null }) {
  if (!user.id || !user.email || !isAphEmail(user.email)) return;

  const electorate = await prisma.electorate.findFirst({
    where: { mpEmail: { equals: user.email, mode: 'insensitive' } },
  });
  await ensurePrincipalOfficeMembership(user);

  await prisma.user.updateMany({
    where: { id: user.id },
    data: {
      role: 'MP',
      electorateId: electorate?.id ?? user.electorateId ?? null,
      subscriptionStatus: 'ACTIVE',
      subscriptionTier: 'PRO',
      trialEndsAt: null,
    } as any,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
  providers: [
    Resend({
      from: 'Crossbench <noreply@crossbench.io>',
      apiKey: process.env.RESEND_API_KEY,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return true;

      // Auto-detect parliamentary accounts by APH email domain.
      if (isAphEmail(user.email)) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, electorateId: true },
        });

        await grantMpEarlyAccess({
          id: existing?.id ?? user.id,
          email: user.email,
          electorateId: existing?.electorateId ?? null,
        });
      }

      return true;
    },

    session({ session, user }) {
      (session.user as any).id = user.id;
      (session.user as any).role = (user as any).role;
      (session.user as any).electorateId = (user as any).electorateId;
      (session.user as any).verifiedAt = (user as any).verifiedAt;
      (session.user as any).subscriptionStatus = (user as any).subscriptionStatus;
      (session.user as any).subscriptionTier = (user as any).subscriptionTier;
      (session.user as any).trialEndsAt = (user as any).trialEndsAt;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-email',
  },
  events: {
    async createUser({ user }) {
      await grantMpEarlyAccess(user);
    },
  },
});
