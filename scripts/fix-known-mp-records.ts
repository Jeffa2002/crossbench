import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const corrections = [
  {
    electorateId: "brand",
    mpName: "Hon Madeleine King MP",
    mpId: "102376",
  },
  {
    electorateId: "herbert",
    mpName: "Mr Phillip Thompson OAM, MP",
    mpId: "281826",
  },
  {
    electorateId: "qld-sen-watt-murray",
    mpName: "Senator Murray Watt",
    mpId: "245759",
  },
  {
    electorateId: "warringah",
    mpName: "Ms Zali Steggall OAM, MP",
    mpId: "175696",
  },
  {
    electorateId: "wide-bay",
    mpName: "Mr Llew O'Brien MP",
    mpId: "265991",
  },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    for (const correction of corrections) {
      const updated = await prisma.electorate.update({
        where: { id: correction.electorateId },
        data: {
          mpId: correction.mpId,
          mpPhotoUrl: `https://www.aph.gov.au/api/parliamentarian/${correction.mpId}/image`,
        },
        select: {
          id: true,
          name: true,
          mpName: true,
          mpId: true,
          mpPhotoUrl: true,
        },
      });

      await prisma.$executeRaw`
        UPDATE "MpProfile"
        SET "aphBioUrl" = ${`https://www.aph.gov.au/Senators_and_Members/Parliamentarian?MPID=${correction.mpId}`},
            "updatedAt" = NOW()
        WHERE "electorateId" = ${correction.electorateId}
      `;

      console.log(`${updated.id}: ${updated.mpName} -> ${updated.mpId}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
