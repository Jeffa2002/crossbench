import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
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

  return NextResponse.json({ normalizedAddress: display_name, latitude: parseFloat(lat), longitude: parseFloat(lon), electorate: result[0] });
}
