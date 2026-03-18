import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://linkbrain.cloud';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Dynamic: public clips
  let clipRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data } = await db
      .from('clips')
      .select('id, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (data) {
      clipRoutes = data.map((clip: { id: string; updated_at: string }) => ({
        url: `${baseUrl}/p/${clip.id}`,
        lastModified: new Date(clip.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }));
    }
  } catch {
    // Sitemap generation should not fail the build
  }

  return [...staticRoutes, ...clipRoutes];
}
