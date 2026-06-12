import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const corrections = [
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
