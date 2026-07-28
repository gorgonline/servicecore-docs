import { createMDX } from 'fumadocs-mdx/next';
import { readFileSync } from 'node:fs';

const withMDX = createMDX();

// Eski Docusaurus sitesinin (docs.servicecore.app) URL'leri indekslenmiş
// durumda; migration sırasında üretilen harita ile kalıcı olarak yeni
// adreslere yönlendirilir. Harita: scripts/migration/convert.py üretir.
const oldUrlRedirects = JSON.parse(
  readFileSync(new URL('./redirects.json', import.meta.url), 'utf8'),
);

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      ...oldUrlRedirects,
      // Eski otomatik kategori sayfaları -> dokümantasyon kökü
      { source: '/docs/category/:slug*', destination: '/docs', permanent: true },
      // Eski blog (Docusaurus şablon içeriği) kaldırıldı
      { source: '/blog/:slug*', destination: '/docs', permanent: true },
      { source: '/markdown-page', destination: '/docs', permanent: true },
      // Eski ayrı arama sayfası — arama artık üst çubukta
      { source: '/search', destination: '/docs', permanent: true },
    ];
  },
};

export default withMDX(config);
