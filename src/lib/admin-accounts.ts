import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotp,
  otpauthUrl,
} from '@/lib/admin-crypto';

// C-04: Per-admin identities with password + TOTP MFA, replacing the single
// shared ADMIN_PASSWORD. Pure crypto lives in admin-crypto.ts (prisma-free,
// unit-tested); this module wires it to the AdminUser table.
//
// Bootstrap fallback: if no AdminUser rows exist yet, ADMIN_PASSWORD still
// works (no MFA) so a deploy can never lock everyone out. Once real admins
// are seeded, the shared password is ignored.

// Re-export the crypto helpers so existing importers keep working.
export { hashPassword, verifyPassword, generateTotpSecret, verifyTotp, otpauthUrl };

export type AdminIdentity = { id: string; email: string };

/**
 * Authenticate an admin by email + password + TOTP against AdminUser rows.
 * Returns the identity on success, or null.
 */
export async function authenticateAdmin(
  email: unknown,
  password: unknown,
  totp: unknown
): Promise<AdminIdentity | null> {
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const admin = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!admin || !admin.active) {
    // Run a dummy hash to keep timing roughly constant for unknown emails.
    verifyPassword(password, 'scrypt$AAAA$AAAA');
    return null;
  }
  if (!verifyPassword(password, admin.passwordHash)) return null;
  if (admin.totpSecret) {
    if (typeof totp !== 'string' || !verifyTotp(admin.totpSecret, totp)) return null;
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {});
  return { id: admin.id, email: admin.email };
}

/**
 * Whether any admin accounts exist. When false, the login route falls back to
 * the legacy shared ADMIN_PASSWORD so deploys cannot lock everyone out.
 */
export async function hasAnyAdminAccount(): Promise<boolean> {
  const count = await prisma.adminUser.count({ where: { active: true } }).catch(() => 0);
  return count > 0;
}
