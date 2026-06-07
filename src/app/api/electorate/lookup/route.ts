import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { createVerificationToken } from '@/lib/verification-token';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = checkRateLimit(rateLimitKey(req, 'electorate-lookup', (session.user as any).id), 10, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many address lookups. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

  const encoded = encodeURIComponent(`${address}, Australia`);
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=au`,
    { headers: { 'User-Agent': 'Crossbench/1.0 contact@crossbench.io' } }
  );
  const geoData = await geoRes.json();
  if (!geoData.length) return NextResponse.json({ error: 'Address not found. Try adding suburb and state.' }, { status: 404 });

  const { lat, lon, display_name } = geoData[0];

  const result = await prisma.$queryRaw<{ id: string; name: string; state: string }[]>`
    SELECT id, name, state FROM "Electorate"
    WHERE ST_Within(ST_SetSRID(ST_Point(${parseFloat(lon)}, ${parseFloat(lat)}), 4326), boundary)
    LIMIT 1
  `;

  if (!result.length) return NextResponse.json({ error: 'Could not determine your electorate. Try a more specific address.' }, { status: 404 });

  const houseElectorate = result[0];

  // Also fetch all senators for this state
  const senators = await prisma.electorate.findMany({
    where: { mpChamber: 'Senate', state: houseElectorate.state },
    select: { id: true, name: true, state: true, mpName: true, mpParty: true, mpPhotoUrl: true },
    orderBy: { mpParty: 'asc' },
  });

  return NextResponse.json({
    normalizedAddress: display_name,
    verificationToken: createVerificationToken(houseElectorate.id, display_name, (session.user as any).id),
    electorate: houseElectorate,
    senators,
  });
}
