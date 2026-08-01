/**
 * C-04: Admin account provisioning CLI.
 *
 * Create/update a per-admin identity with a password and (optionally) enroll
 * TOTP MFA. Replaces the single shared ADMIN_PASSWORD.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts create <email> [--password <pw>] [--totp]
 *   npx tsx scripts/seed-admin.ts totp <email>          # (re)generate TOTP secret
 *   npx tsx scripts/seed-admin.ts disable <email>
 *   npx tsx scripts/seed-admin.ts list
 *
 * If --password is omitted, a strong random password is generated and printed.
 * When --totp (or the totp subcommand) is used, an otpauth:// URL is printed
 * for enrollment in an authenticator app (Google Authenticator, Authy, etc).
 */
import { randomBytes } from 'crypto';
import { prisma } from '../src/lib/prisma';
import {
  hashPassword,
  generateTotpSecret,
  otpauthUrl,
} from '../src/lib/admin-accounts';

function randomPassword(): string {
  return randomBytes(18).toString('base64url');
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [, , cmd, emailArg] = process.argv;
  const email = emailArg?.trim().toLowerCase();

  if (cmd === 'list') {
    const admins = await prisma.adminUser.findMany({
      select: { email: true, active: true, totpSecret: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!admins.length) {
      console.log('No admin accounts. (Login falls back to shared ADMIN_PASSWORD.)');
    } else {
      for (const a of admins) {
        console.log(
          `${a.active ? 'ACTIVE ' : 'DISABLED'} ${a.email}  mfa=${a.totpSecret ? 'on' : 'off'}  lastLogin=${a.lastLoginAt?.toISOString() ?? 'never'}`
        );
      }
    }
    return;
  }

  if (!email) {
    console.error('Email required.');
    process.exit(1);
  }

  if (cmd === 'create') {
    const password = arg('--password') ?? randomPassword();
    const enrollTotp = process.argv.includes('--totp');
    const totpSecret = enrollTotp ? generateTotpSecret() : null;

    const admin = await prisma.adminUser.upsert({
      where: { email },
      create: { email, passwordHash: hashPassword(password), totpSecret, active: true },
      update: { passwordHash: hashPassword(password), ...(enrollTotp ? { totpSecret } : {}), active: true },
    });

    console.log(`Admin ${admin.email} created/updated.`);
    if (!arg('--password')) console.log(`  Generated password: ${password}`);
    if (totpSecret) {
      console.log(`  TOTP secret: ${totpSecret}`);
      console.log(`  Enroll URL:  ${otpauthUrl(email, totpSecret)}`);
    }
    return;
  }

  if (cmd === 'totp') {
    const totpSecret = generateTotpSecret();
    await prisma.adminUser.update({ where: { email }, data: { totpSecret } });
    console.log(`TOTP (re)generated for ${email}.`);
    console.log(`  TOTP secret: ${totpSecret}`);
    console.log(`  Enroll URL:  ${otpauthUrl(email, totpSecret)}`);
    return;
  }

  if (cmd === 'disable') {
    await prisma.adminUser.update({ where: { email }, data: { active: false } });
    console.log(`Admin ${email} disabled.`);
    return;
  }

  console.error('Unknown command. Use: create | totp | disable | list');
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
