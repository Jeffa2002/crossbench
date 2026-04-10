import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Resend from 'next-auth/providers/resend';
import { prisma } from './prisma';

// MP email patterns - @aph.gov.au is definitive; senators may use @aph.gov.au too
function isMpEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@aph.gov.au');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [
    Resend({
      from: 'Crossbench <noreply@crossbench.io>',
      apiKey: process.env.RESEND_API_KEY,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return true;

      // Auto-detect MP by email domain
      if (isMpEmail(user.email)) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, electorateId: true, trialEndsAt: true },
        });

        if (existing && existing.role !== 'MP') {
          // Find matching electorate by mpEmail
          const electorate = await prisma.electorate.findFirst({
            where: { mpEmail: { equals: user.email, mode: 'insensitive' } },
          });

          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);

          await prisma.user.update({
            where: { id: existing.id },
            data: {
              role: 'MP',
              electorateId: electorate?.id ?? existing.electorateId,
              subscriptionStatus: 'TRIAL',
              subscriptionTier: 'PRO', // Full Pro during trial
              trialEndsAt,
            } as any,
          });
        } else if (existing && existing.role === 'MP' && !existing.trialEndsAt) {
          // Existing MP without trial date set - fix it
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);
          await prisma.user.update({
            where: { id: existing.id },
            data: { trialEndsAt, subscriptionTier: 'PRO' } as any,
          });
        }
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
});
