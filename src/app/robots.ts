import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // /ekip/ altı iç kullanım (toplantı sunumu). Depo public olduğu için
    // içerik zaten erişilebilir; burada yalnızca arama motorlarının
    // dizinlemesini engelliyoruz — müşteri aramasında çıkması anlamsız olur.
    rules: { userAgent: '*', allow: '/', disallow: '/ekip/' },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
