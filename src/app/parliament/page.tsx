import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import ParliamentClient, { ParliamentData } from './ParliamentClient';

export const revalidate = 3600;

function normalise(party: string | null): string {
  if (!party) return 'Independent';
  const p = party.trim();
  if (p.includes('Labor')) return 'ALP';
  if (p === 'Liberal Party of Australia' || p === 'Liberal Party') return 'Liberal';
  if (p === 'Liberal National Party of Queensland' || p === 'Liberal National Party') return 'LNP';
  if (p === 'The Nationals' || p === 'National Party') return 'Nationals';
  if (p.includes('Greens')) return 'Greens';
  if (p.includes('One Nation') || p.includes('Pauline Hanson')) return 'One Nation';
  if (p === "Katter's Australian Party") return 'KAP';
  if (p === 'Jacqui Lambie Network') return 'JLN';
  if (p === 'United Australia Party') return 'UAP';
  if (p === 'Country Liberal Party') return 'CLP';
  if (p === 'Centre Alliance') return 'CA';
  if (p === "Australia's Voice") return 'AU Voice';
  if (p === 'PRES' || p === 'DPRES') return 'President';
  return 'Independent';
}

export default async function ParliamentPage() {
  const [hor, senate] = await Promise.all([
    prisma.electorate.findMany({
      where: { mpChamber: 'House of Reps', mpName: { not: null } },
      select: { id: true, name: true, mpName: true, mpParty: true, mpPhotoUrl: true, state: true },
      orderBy: [{ mpParty: 'asc' }, { mpName: 'asc' }],
    }),
    prisma.electorate.findMany({
      where: { mpChamber: 'Senate', mpName: { not: null } },
      select: { id: true, name: true, mpName: true, mpParty: true, mpPhotoUrl: true, state: true },
      orderBy: [{ state: 'asc' }, { mpName: 'asc' }],
    }),
  ]);

  const mapMember = (m: typeof hor[0]) => ({
    id: m.id,
    name: m.mpName,
    electorate: m.name,
    state: m.state,
    party: normalise(m.mpParty),
    rawParty: m.mpParty,
    photo: m.mpPhotoUrl,
  });

  const data: ParliamentData = {
    hor: hor.map(mapMember),
    senate: senate.map(mapMember),
  };

  return (
    <>
      <Nav />
      <main style={{ minHeight: '100vh', background: '#070D1A' }}>
        <ParliamentClient data={data} />
      </main>
    </>
  );
}
