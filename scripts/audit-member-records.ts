import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type ElectorateRow = {
  id: string;
  name: string;
  state: string;
  mpName: string | null;
  mpId: string | null;
  mpPhotoUrl: string | null;
  mpChamber: string | null;
  profileElectorateId: string | null;
  aphBioUrl: string | null;
};

function aphProfileUrl(mpId: string) {
  return `https://www.aph.gov.au/Senators_and_Members/Parliamentarian?MPID=${mpId}`;
}

function aphPhotoUrl(mpId: string) {
  return `https://www.aph.gov.au/api/parliamentarian/${mpId}/image`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const rows = await prisma.$queryRaw<ElectorateRow[]>`
      SELECT
        e.id,
        e.name,
        e.state,
        e."mpName",
        e."mpId",
        e."mpPhotoUrl",
        e."mpChamber",
        p."electorateId" AS "profileElectorateId",
        p."aphBioUrl"
      FROM "Electorate" e
      LEFT JOIN "MpProfile" p ON p."electorateId" = e.id
      WHERE e."mpName" IS NOT NULL AND e."mpName" <> ''
      ORDER BY e."mpChamber", e.state, e.name
    `;

    const issues: string[] = [];
    const byMpId = new Map<string, ElectorateRow[]>();

    for (const row of rows) {
      const mpId = row.mpId?.trim();
      if (!mpId) {
        issues.push(`${row.id}: missing mpId (${row.mpName})`);
        continue;
      }

      byMpId.set(mpId, [...(byMpId.get(mpId) || []), row]);

      if (!row.mpPhotoUrl?.trim()) {
        issues.push(`${row.id}: missing mpPhotoUrl, expected ${aphPhotoUrl(mpId)}`);
      } else if (row.mpPhotoUrl.includes("aph.gov.au/api/parliamentarian/") && row.mpPhotoUrl !== aphPhotoUrl(mpId)) {
        issues.push(`${row.id}: APH photo mismatch ${row.mpPhotoUrl} != ${aphPhotoUrl(mpId)}`);
      }

      if (row.aphBioUrl?.trim() && row.aphBioUrl !== aphProfileUrl(mpId)) {
        issues.push(`${row.id}: APH profile mismatch ${row.aphBioUrl} != ${aphProfileUrl(mpId)}`);
      }

      if (!row.profileElectorateId) {
        issues.push(`${row.id}: missing MpProfile row`);
      }
    }

    for (const [mpId, matches] of byMpId) {
      if (matches.length > 1) {
        issues.push(`${mpId}: duplicate mpId on ${matches.map(row => `${row.id} (${row.mpName})`).join(", ")}`);
      }
    }

    console.log(`Audited ${rows.length} member records.`);
    if (!issues.length) {
      console.log("No internal MPID/photo/profile-link issues found.");
      return;
    }

    console.log(`${issues.length} issue(s):`);
    for (const issue of issues) {
      console.log(`- ${issue}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
