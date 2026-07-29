import { createMDX } from 'fumadocs-mdx/next';
import { readFileSync } from 'node:fs';

const withMDX = createMDX();

// Eski Docusaurus sitesinin (docs.servicecore.app) URL'leri indekslenmiş
// durumda; migration sırasında üretilen harita ile kalıcı olarak yeni
// adreslere yönlendirilir. Harita: scripts/migration/convert.py üretir.
let oldUrlRedirects = [];
try {
  oldUrlRedirects = JSON.parse(
    readFileSync(new URL('./redirects.json', import.meta.url), 'utf8'),
  );
} catch (err) {
  // Dosya yoksa/bozuksa site yine derlenir; yalnızca eski URL'ler yönlenmez.
  console.warn('[next.config] redirects.json okunamadı:', err.message);
}

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
      // Eski site tüm ağacın bir kopyasını /docs/ önekiyle de yayınlıyordu
      // (Docusaurus baseUrl artığı: /docs/docs/..., /docs/blog/...). Bu
      // adresler canlıydı, dış bağlantılar taşıyabilir; öneki düşürüp
      // gerçek karşılığına yönlendiriyoruz (oradaki kural zinciri tamamlar).
      { source: '/docs/docs/:path*', destination: '/docs/:path*', permanent: true },
      { source: '/docs/blog/:path*', destination: '/docs', permanent: true },
      { source: '/docs/markdown-page', destination: '/docs', permanent: true },
      { source: '/docs/search', destination: '/docs', permanent: true },
    ];
  },
};

export default withMDX(config);
