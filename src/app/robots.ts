import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/features', '/pricing', '/explore', '/p/'],
        disallow: ['/dashboard', '/settings', '/studio', '/insights', '/api/', '/callback'],
      },
    ],
    sitemap: 'https://linkbrain.cloud/sitemap.xml',
  };
}
