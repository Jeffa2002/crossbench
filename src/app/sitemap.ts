import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const baseUrl = 'https://crossbench.io';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/bills`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/for-mps`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/mp-demo`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/electorates`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const [bills, electorates] = await Promise.all([
      prisma.bill.findMany({
        where: { status: 'Before Parliament', parliamentNumber: 48 },
        orderBy: { lastUpdatedAt: 'desc' },
        take: 250,
        select: { id: true, lastUpdatedAt: true },
      }),
      prisma.electorate.findMany({
        where: { mpName: { not: null } },
        orderBy: { name: 'asc' },
        take: 250,
        select: { id: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...bills.map(bill => ({
        url: `${baseUrl}/bills/${bill.id}`,
        lastModified: bill.lastUpdatedAt ?? now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
      ...electorates.map(electorate => ({
        url: `${baseUrl}/electorates/${electorate.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
