import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { site } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();
  return [
    {
      url: site.url,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...pages.map((page) => ({
      url: `${site.url}${page.url}`,
      changeFrequency: 'weekly' as const,
      priority: page.slugs.length <= 1 ? 0.8 : 0.6,
    })),
  ];
}
